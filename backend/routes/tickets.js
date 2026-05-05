const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
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

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const ALLOWED_EXTENSIONS = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt)$/i;

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validExt = ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
    const validMime = ALLOWED_MIME_TYPES.has(file.mimetype);
    if (validExt && validMime) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: images, PDF, Word documents, text files.'));
    }
  }
});

// Get all tickets (with filters + search)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, assigned_to, category, search } = req.query;

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

    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    if (assigned_to) {
      params.push(assigned_to);
      query += ` AND t.assigned_to = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND t.category_id = $${params.length}`;
    }

    // Search: match ticket ID (exact), title (partial), or description (partial)
    if (search && search.trim()) {
      const term = search.trim();
      // If the search term is a number, also match ticket ID exactly
      if (/^\d+$/.test(term)) {
        params.push(term);
        params.push(`%${term}%`);
        query += ` AND (t.id = $${params.length - 1} OR t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
      } else {
        params.push(`%${term}%`);
        query += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
      }
    }

    // Regular users see only their own tickets
    if (req.user.role === 'user') {
      params.push(req.user.id);
      query += ` AND t.created_by = $${params.length}`;
    }

    query += ' GROUP BY t.id, u.name, e.name, c.name ORDER BY t.created_at DESC';

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
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
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
      [title, description, priority, category_id || null, req.user.id]
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

    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    if (req.user.role === 'user' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

// Update ticket status/assignment — engineers and admins only
router.patch('/:id', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'engineer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Engineers and admins only.' });
  }
  next();
}, [
  body('status').optional().isIn(['open', 'in_progress', 'resolved']),
  body('assigned_to').optional(),
  body('comment').if(body('status').exists()).notEmpty().withMessage('Comment is required when changing ticket status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { status, assigned_to, comment } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updates = [];
      const params = [];

      if (status) {
        params.push(status);
        updates.push(`status = $${params.length}`);
        if (status === 'resolved') {
          updates.push(`resolved_at = CURRENT_TIMESTAMP`);
        }
      }

      if (assigned_to !== undefined) {
        params.push(assigned_to || null);
        updates.push(`assigned_to = $${params.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);
      const query = `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (comment) {
        await client.query(
          'INSERT INTO comments (ticket_id, user_id, content) VALUES ($1, $2, $3)',
          [id, req.user.id, comment]
        );
      }

      await client.query('COMMIT');

      const updatedTicket = result.rows[0];

      // Send email notification to ticket owner on status change
      if (status) {
        try {
          const ownerResult = await pool.query(
            'SELECT email, notification_email, name FROM users WHERE id = $1',
            [updatedTicket.created_by]
          );

          if (ownerResult.rows.length > 0 && ownerResult.rows[0].notification_email) {
            const owner = ownerResult.rows[0];
            const friendlyStatus = status === 'resolved'
              ? 'Resolved'
              : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const subject = `Ticket #${updatedTicket.id} status updated to ${friendlyStatus}`;
            const text = `Hello ${owner.name || 'User'},\n\nYour ticket titled "${updatedTicket.title}" has been updated to "${friendlyStatus}".\n\nComment:\n${comment || 'No comment provided.'}\n\nYou can review the ticket in the system for more details.\n\nThank you.`;
            const html = `
              <p>Hello ${owner.name || 'User'},</p>
              <p>Your ticket titled <strong>${updatedTicket.title}</strong> has been updated to <strong>${friendlyStatus}</strong>.</p>
              <p><strong>Comment:</strong><br />${comment ? comment.replace(/\n/g, '<br />') : 'No comment provided.'}</p>
              <p>You can review the ticket in the system for more details.</p>
              <p>Thank you.</p>
            `;
            await sendEmail({ to: owner.notification_email, subject, text, html });
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError.message || emailError);
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
  body('content').notEmpty().withMessage('Comment content is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { content } = req.body;

    const ticketResult = await pool.query('SELECT created_by FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (req.user.role === 'user' && ticketResult.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [id, req.user.id, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
