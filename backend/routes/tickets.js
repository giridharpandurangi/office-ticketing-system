const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

const SLA_HOURS = { high: 4, medium: 24, low: 72 };

// ── Multer setup ─────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validExt = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt)$/i.test(path.extname(file.originalname));
    const validMime = ALLOWED_MIME_TYPES.has(file.mimetype);
    if (validExt && validMime) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: images, PDF, Word documents, text files.'));
  }
});

// ── Helper: build parameterised placeholder ──────────────────────────────────
// Avoids the template-literal $ interpretation issue
function p(n) { return '$' + n; }

// ── GET /api/tickets/stats ───────────────────────────────────────────────────

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const isUser = req.user.role === 'user';
    const scopeClause = isUser ? 'WHERE created_by = $1' : 'WHERE 1=1';
    const scopeParams = isUser ? [req.user.id] : [];

    // Count by status
    const countResult = await pool.query(
      'SELECT status, COUNT(*) as count FROM tickets ' + scopeClause + ' GROUP BY status',
      scopeParams
    );

    const counts = { open: 0, in_progress: 0, waiting_for_approval: 0, resolved: 0, voided: 0 };
    countResult.rows.forEach(row => {
      if (counts.hasOwnProperty(row.status)) {
        counts[row.status] = parseInt(row.count);
      }
    });

    // Average resolution time in hours (resolved tickets only)
    const avgResult = await pool.query(
      'SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours FROM tickets ' +
      scopeClause + (scopeClause.includes('WHERE') ? ' AND' : ' WHERE') +
      " resolved_at IS NOT NULL AND status = 'resolved'",
      scopeParams
    );

    const avgHours = avgResult.rows[0].avg_hours
      ? parseFloat(avgResult.rows[0].avg_hours).toFixed(1)
      : null;

    // Overdue count (active tickets past due_at)
    const overdueResult = await pool.query(
      "SELECT COUNT(*) as count FROM tickets " + scopeClause +
      (scopeClause.includes('WHERE') ? ' AND' : ' WHERE') +
      " due_at < NOW() AND status NOT IN ('resolved', 'voided')",
      scopeParams
    );
    const overdue = parseInt(overdueResult.rows[0].count);

    res.json({ counts, avg_resolution_hours: avgHours, overdue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tickets ─────────────────────────────────────────────────────────

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, assigned_to, category, search } = req.query;

    let query = [
      'SELECT t.*, u.name as created_by_name, e.name as assigned_to_name, c.name as category_name,',
      "COALESCE(json_agg(a) FILTER (WHERE a.id IS NOT NULL), '[]') as attachments",
      'FROM tickets t',
      'LEFT JOIN users u ON t.created_by = u.id',
      'LEFT JOIN users e ON t.assigned_to = e.id',
      'LEFT JOIN categories c ON t.category_id = c.id',
      'LEFT JOIN attachments a ON t.id = a.ticket_id',
      'WHERE 1=1'
    ].join(' ');

    const params = [];

    if (status) {
      params.push(status);
      query += ' AND t.status = ' + p(params.length);
    }
    if (assigned_to) {
      params.push(assigned_to);
      query += ' AND t.assigned_to = ' + p(params.length);
    }
    if (category) {
      params.push(category);
      query += ' AND t.category_id = ' + p(params.length);
    }
    if (search && search.trim()) {
      const term = search.trim();
      if (/^\d+$/.test(term)) {
        params.push(term);
        const n1 = params.length;
        params.push('%' + term + '%');
        const n2 = params.length;
        query += ' AND (t.id = ' + p(n1) + ' OR t.title ILIKE ' + p(n2) + ' OR t.description ILIKE ' + p(n2) + ')';
      } else {
        params.push('%' + term + '%');
        const n = params.length;
        query += ' AND (t.title ILIKE ' + p(n) + ' OR t.description ILIKE ' + p(n) + ')';
      }
    }
    if (req.user.role === 'user') {
      params.push(req.user.id);
      query += ' AND t.created_by = ' + p(params.length);
    }

    query += ' GROUP BY t.id, u.name, e.name, c.name ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tickets/:id ─────────────────────────────────────────────────────

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const ticketResult = await pool.query(
      [
        'SELECT t.*, u.name as created_by_name, e.name as assigned_to_name, c.name as category_name,',
        "COALESCE(json_agg(a) FILTER (WHERE a.id IS NOT NULL), '[]') as attachments",
        'FROM tickets t',
        'LEFT JOIN users u ON t.created_by = u.id',
        'LEFT JOIN users e ON t.assigned_to = e.id',
        'LEFT JOIN categories c ON t.category_id = c.id',
        'LEFT JOIN attachments a ON t.id = a.ticket_id',
        'WHERE t.id = $1',
        'GROUP BY t.id, u.name, e.name, c.name'
      ].join(' '),
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
      'SELECT c.*, u.name as user_name FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.ticket_id = $1 ORDER BY c.created_at ASC',
      [id]
    );

    res.json({ ...ticket, comments: commentsResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tickets ────────────────────────────────────────────────────────

router.post('/', authMiddleware, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority').isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('category_id').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, priority, category_id } = req.body;
    const slaHours = SLA_HOURS[priority] || 24;

    const result = await pool.query(
      "INSERT INTO tickets (title, description, priority, category_id, created_by, due_at) VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' hours')::INTERVAL) RETURNING *",
      [title, description, priority, category_id || null, req.user.id, slaHours]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tickets/:id/attachments ────────────────────────────────────────

router.post('/:id/attachments', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = ticketResult.rows[0];
    if (req.user.role === 'user' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'INSERT INTO attachments (ticket_id, filename, original_name, mime_type, size, path, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.path, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/tickets/:id/reopen ────────────────────────────────────────────
// Users can reopen their own resolved tickets; engineers/admins can reopen any

router.patch('/:id/reopen', authMiddleware, [
  body('reason').notEmpty().withMessage('Please describe why you are re-opening this ticket')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = ticketResult.rows[0];

    if (ticket.status !== 'resolved') {
      return res.status(400).json({ error: 'Only resolved tickets can be re-opened.' });
    }
    if (req.user.role === 'user' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Reset SLA from now
    const slaHours = SLA_HOURS[ticket.priority] || 24;

    const result = await pool.query(
      "UPDATE tickets SET status = 'open', resolved_at = NULL, due_at = NOW() + ($1 || ' hours')::INTERVAL, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [slaHours, id]
    );

    // Record the reopen as a comment
    await pool.query(
      'INSERT INTO comments (ticket_id, user_id, content) VALUES ($1, $2, $3)',
      [id, req.user.id, 'Ticket re-opened. Reason: ' + reason]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/tickets/:id/void ──────────────────────────────────────────────

router.patch('/:id/void', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied. Admins only.' });
  next();
}, [
  body('reason').notEmpty().withMessage('A reason is required to void a ticket')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      "UPDATE tickets SET status = 'voided', voided_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status != 'voided' RETURNING *",
      [reason, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found or already voided' });
    }

    await pool.query(
      'INSERT INTO comments (ticket_id, user_id, content) VALUES ($1, $2, $3)',
      [id, req.user.id, 'Ticket voided. Reason: ' + reason]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/tickets/:id ───────────────────────────────────────────────────
// Engineers and admins only

router.patch('/:id', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'engineer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Engineers and admins only.' });
  }
  next();
}, [
  body('status').optional().isIn(['open', 'in_progress', 'waiting_for_approval', 'resolved']),
  body('assigned_to').optional(),
  body('comment').if(body('status').exists()).notEmpty().withMessage('Comment is required when changing ticket status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { status, assigned_to, comment } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const current = await client.query('SELECT status FROM tickets WHERE id = $1', [id]);
      if (current.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
      if (current.rows[0].status === 'voided') {
        return res.status(400).json({ error: 'Cannot update a voided ticket.' });
      }

      const updates = [];
      const params = [];

      if (status) {
        params.push(status);
        updates.push('status = ' + p(params.length));
        if (status === 'resolved') updates.push('resolved_at = CURRENT_TIMESTAMP');
      }
      if (assigned_to !== undefined) {
        params.push(assigned_to || null);
        updates.push('assigned_to = ' + p(params.length));
      }
      if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      const query = 'UPDATE tickets SET ' + updates.join(', ') + ' WHERE id = ' + p(params.length) + ' RETURNING *';

      const result = await client.query(query, params);

      if (comment) {
        await client.query(
          'INSERT INTO comments (ticket_id, user_id, content) VALUES ($1, $2, $3)',
          [id, req.user.id, comment]
        );
      }

      await client.query('COMMIT');

      const updatedTicket = result.rows[0];

      // Email to ticket owner on status change (respects notification_preference)
      if (status && updatedTicket.created_by) {
        try {
          const ownerResult = await pool.query(
            'SELECT name, notification_email, notification_preference FROM users WHERE id = $1',
            [updatedTicket.created_by]
          );
          if (ownerResult.rows.length > 0) {
            const owner = ownerResult.rows[0];
            const pref = owner.notification_preference || 'all';
            const shouldSend =
              owner.notification_email &&
              pref !== 'disabled' &&
              (pref === 'all' || (pref === 'resolved_only' && status === 'resolved'));

            if (shouldSend) {
              const friendlyStatus = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const subject = 'Ticket #' + updatedTicket.id + ' status updated to ' + friendlyStatus;
              const commentText = comment || 'No comment provided.';
              const text = 'Hello ' + (owner.name || 'User') + ',\n\nYour ticket titled "' + updatedTicket.title + '" has been updated to "' + friendlyStatus + '".\n\nComment:\n' + commentText + '\n\nThank you.';
              const html = '<p>Hello ' + (owner.name || 'User') + ',</p><p>Your ticket titled <strong>' + updatedTicket.title + '</strong> has been updated to <strong>' + friendlyStatus + '</strong>.</p><p><strong>Comment:</strong><br />' + commentText.replace(/\n/g, '<br />') + '</p><p>Thank you.</p>';
              await sendEmail({ to: owner.notification_email, subject, text, html });
            }
          }
        } catch (emailError) {
          console.error('Failed to send status email to ticket owner:', emailError.message || emailError);
        }
      }

      // Email to engineer when ticket is assigned to them
      if (assigned_to && updatedTicket.assigned_to) {
        try {
          const engineerResult = await pool.query(
            'SELECT name, notification_email FROM users WHERE id = $1',
            [updatedTicket.assigned_to]
          );
          if (engineerResult.rows.length > 0) {
            const engineer = engineerResult.rows[0];
            if (engineer.notification_email) {
              const priority = updatedTicket.priority.charAt(0).toUpperCase() + updatedTicket.priority.slice(1);
              const subject = 'Ticket #' + updatedTicket.id + ' has been assigned to you';
              const text = 'Hello ' + engineer.name + ',\n\nTicket #' + updatedTicket.id + ' has been assigned to you.\n\nTitle: ' + updatedTicket.title + '\nPriority: ' + priority + '\nStatus: ' + updatedTicket.status.replace(/_/g, ' ') + '\n\nPlease log in to the ticketing system to review and action this ticket.\n\nThank you.';
              const html = '<p>Hello ' + engineer.name + ',</p>' +
                '<p>Ticket <strong>#' + updatedTicket.id + '</strong> has been assigned to you.</p>' +
                '<table style="border-collapse:collapse;margin:1rem 0">' +
                '<tr><td style="padding:0.3rem 1rem 0.3rem 0;color:#555"><strong>Title</strong></td><td>' + updatedTicket.title + '</td></tr>' +
                '<tr><td style="padding:0.3rem 1rem 0.3rem 0;color:#555"><strong>Priority</strong></td><td>' + priority + '</td></tr>' +
                '<tr><td style="padding:0.3rem 1rem 0.3rem 0;color:#555"><strong>Status</strong></td><td>' + updatedTicket.status.replace(/_/g, ' ') + '</td></tr>' +
                '</table>' +
                '<p>Please log in to the ticketing system to review and action this ticket.</p>' +
                '<p>Thank you.</p>';
              await sendEmail({ to: engineer.notification_email, subject, text, html });
            }
          }
        } catch (emailError) {
          console.error('Failed to send assignment email to engineer:', emailError.message || emailError);
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

// ── POST /api/tickets/:id/comments ───────────────────────────────────────────

router.post('/:id/comments', authMiddleware, [
  body('content').notEmpty().withMessage('Comment content is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { content } = req.body;

    const ticketResult = await pool.query('SELECT created_by, status FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    if (req.user.role === 'user' && ticketResult.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'INSERT INTO comments (ticket_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
