const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db/init');
const { authMiddleware, engineerOnly } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all tickets (with filters)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, assigned_to, category } = req.query;
    let query = `
      SELECT t.*, u.name as created_by_name, e.name as assigned_to_name, c.name as category_name,
             COALESCE(json_agg(a) FILTER (WHERE a.id IS NOT NULL), '[]') as attachments
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users e ON t.assigned_to = e.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN attachments a ON t.id = a.ticket_id
      WHERE 1=1
    `;
    const params = [];
    const groupBy = ' GROUP BY t.id, u.name, e.name, c.name';

    if (status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    if (assigned_to) {
      query += ` AND t.assigned_to = $${params.length + 1}`;
      params.push(assigned_to);
    }

    if (category) {
      query += ` AND t.category_id = $${params.length + 1}`;
      params.push(category);
    }

    // Regular users see only their own tickets
    if (req.user.role === 'user') {
      query += ` AND t.created_by = $${params.length + 1}`;
      params.push(req.user.id);
    }

    query += groupBy + ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single ticket with comments
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const ticketResult = await pool.query(
      `SELECT t.*, u.name as created_by_name, e.name as assigned_to_name, c.name as category_name,
              COALESCE(json_agg(a) FILTER (WHERE a.id IS NOT NULL), '[]') as attachments
       FROM tickets t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN users e ON t.assigned_to = e.id
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN attachments a ON t.id = a.ticket_id
       WHERE t.id = $1
       GROUP BY t.id, u.name, e.name, c.name`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Check access
    if (req.user.role === 'user' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const commentsResult = await pool.query(
      `SELECT c.*, u.name as user_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    res.json({ ...ticket, comments: commentsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create ticket
router.post('/', authMiddleware, [
  body('title').notEmpty(),
  body('description').notEmpty(),
  body('priority').isIn(['low', 'medium', 'high']),
  body('category_id').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description, priority, category_id } = req.body;

    const result = await pool.query(
      `INSERT INTO tickets (title, description, priority, category_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, priority, category_id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload attachment to ticket
router.post('/:id/attachments', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if ticket exists and user has access
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    if (req.user.role === 'user' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Save attachment info to database
    const result = await pool.query(
      `INSERT INTO attachments (ticket_id, filename, original_name, mime_type, size, path, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.path, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ticket status (engineer only)
router.patch('/:id', authMiddleware, engineerOnly, [
  body('status').optional().isIn(['open', 'in_progress', 'resolved']),
  body('assigned_to').optional().isInt(),
  body('comment').if(body('status').exists()).notEmpty().withMessage('Comment is required when changing ticket status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { status, assigned_to, comment } = req.body;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let query = 'UPDATE tickets SET ';
      const params = [];
      const updates = [];

      if (status) {
        updates.push(`status = $${params.length + 1}`);
        params.push(status);
        if (status === 'resolved') {
          updates.push(`resolved_at = CURRENT_TIMESTAMP`);
        }
      }

      if (assigned_to !== undefined) {
        updates.push(`assigned_to = $${params.length + 1}`);
        params.push(assigned_to);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      query += updates.join(', ');
      query += `, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length + 1}`;
      params.push(id);
      query += ' RETURNING *';

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Add comment if provided
      if (comment) {
        await client.query(
          'INSERT INTO comments (ticket_id, user_id, content) VALUES ($1, $2, $3)',
          [id, req.user.id, comment]
        );
      }

      await client.query('COMMIT');

      const updatedTicket = result.rows[0];
      if (status) {
        try {
          const ownerResult = await pool.query(
            'SELECT email, notification_email, name FROM users WHERE id = $1',
            [updatedTicket.created_by]
          );

          if (ownerResult.rows.length > 0 && ownerResult.rows[0].notification_email) {
            const owner = ownerResult.rows[0];
            const friendlyStatus = status === 'resolved' ? 'Resolved' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const subject = `Ticket #${updatedTicket.id} status updated to ${friendlyStatus}`;
            const text = `Hello ${owner.name || 'User'},\n\nYour ticket titled \"${updatedTicket.title}\" has been updated to \"${friendlyStatus}\".\n\nComment:\n${comment || 'No comment provided.'}\n\nYou can review the ticket in the system for more details.\n\nThank you.`;
            const html = `
              <p>Hello ${owner.name || 'User'},</p>
              <p>Your ticket titled <strong>${updatedTicket.title}</strong> has been updated to <strong>${friendlyStatus}</strong>.</p>
              <p><strong>Comment:</strong><br />${comment ? comment.replace(/\n/g, '<br />') : 'No comment provided.'}</p>
              <p>You can review the ticket in the system for more details.</p>
              <p>Thank you.</p>
            `;

            await sendEmail({
              to: owner.notification_email,
              subject,
              text,
              html,
            });
          }
        } catch (emailError) {
          console.error('Failed to send ticket status email notification:', emailError.message || emailError);
        }
      }

      res.json(updatedTicket);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment
router.post('/:id/comments', authMiddleware, [
  body('content').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { content } = req.body;

    const result = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.user.id, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
