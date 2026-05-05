const express = require('express');
const bcryptjs = require('bcryptjs');
const { pool } = require('../db/init');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendTestEmail } = require('../utils/mailer');

const router = express.Router();

// Get all users (admin only)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, role || 'user']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get current user's profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, notification_email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update current user's notification email
router.patch('/me/profile', authMiddleware, async (req, res) => {
  try {
    const { notification_email } = req.body;

    if (!notification_email || !notification_email.trim()) {
      return res.status(400).json({ error: 'Notification email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(notification_email.trim())) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await pool.query(
      'UPDATE users SET notification_email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, notification_email',
      [notification_email.trim(), req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send test email to current user's notification email
router.post('/me/test-email', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, notification_email FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];

    if (!user || !user.notification_email) {
      return res.status(400).json({ error: 'No notification email set. Save one first.' });
    }

    await sendTestEmail(user.notification_email, user.name);
    res.json({ message: `Test email sent to ${user.notification_email}` });
  } catch (err) {
    res.status(500).json({ error: `Failed to send email: ${err.message}` });
  }
});

// Get engineers (for assignment dropdown)
router.get('/engineers/list', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name FROM users WHERE role = 'engineer' ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'engineer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset user password (admin only)
router.patch('/:id/reset-password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Admin cannot reset their own password from this endpoint
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Use the profile page to change your own password.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `Password reset successfully for ${result.rows[0].name}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Admin cannot delete themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const userResult = await pool.query('SELECT name, role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Block deletion only if user has open/in-progress tickets
    // Resolved tickets are kept as history — that's fine
    const activeTickets = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE created_by = $1 AND status != 'resolved'",
      [id]
    );
    if (parseInt(activeTickets.rows[0].count) > 0) {
      return res.status(400).json({
        error: `Cannot delete "${userResult.rows[0].name}" — they have ${activeTickets.rows[0].count} open or in-progress ticket(s). Resolve those tickets first, or reassign them to another user.`
      });
    }

    // Unassign tickets assigned to this user
    await pool.query('UPDATE tickets SET assigned_to = NULL WHERE assigned_to = $1', [id]);

    // For resolved tickets created by this user, preserve the name in the title
    // by nulling out created_by (requires the column to allow NULL — migration below handles this)
    await pool.query('UPDATE tickets SET created_by = NULL WHERE created_by = $1', [id]);

    // Also null out any comments by this user (keep content, remove user link)
    await pool.query('UPDATE comments SET user_id = NULL WHERE user_id = $1', [id]);

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: `User "${userResult.rows[0].name}" has been deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
