const express = require('express');
const bcryptjs = require('bcryptjs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { parse: parseCsv } = require('csv-parse/sync');
const { pool } = require('../db/init');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendTestEmail } = require('../utils/mailer');

const router = express.Router();

// Multer — memory storage for import uploads (no disk write needed)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /\.(csv|xlsx|xls)$/i;
    if (allowed.test(file.originalname)) return cb(null, true);
    cb(new Error('Only CSV and Excel files are supported.'));
  }
});

// Get all users (admin only)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC'
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
      'SELECT id, email, name, role, notification_email, notification_preference, created_at FROM users WHERE id = $1',
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

// Update current user's notification settings
router.patch('/me/profile', authMiddleware, async (req, res) => {
  try {
    const { notification_email, notification_preference } = req.body;

    if (!notification_email || !notification_email.trim()) {
      return res.status(400).json({ error: 'Notification email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(notification_email.trim())) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const validPreferences = ['all', 'resolved_only', 'disabled'];
    const pref = validPreferences.includes(notification_preference) ? notification_preference : 'all';

    const result = await pool.query(
      `UPDATE users
       SET notification_email = $1, notification_preference = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, name, role, notification_email, notification_preference`,
      [notification_email.trim(), pref, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change own password — requires current password to verify identity
router.patch('/me/password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    if (current_password === new_password) {
      return res.status(400).json({ error: 'New password must be different from your current password.' });
    }

    // Fetch current hashed password
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const valid = await bcryptjs.compare(current_password, result.rows[0].password);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcryptjs.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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

// Get engineers and admins (for assignment dropdown — admins can assign to anyone)
router.get('/engineers/list', authMiddleware, async (req, res) => {
  try {
    // Admins see all engineers + admins for assignment
    // Engineers only see other engineers
    const roles = req.user.role === 'admin' ? "('engineer', 'admin')" : "('engineer')";
    const result = await pool.query(
      `SELECT id, email, name, role FROM users WHERE role IN ${roles} ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle user active/inactive (admin only)
router.patch('/:id/toggle-active', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const userResult = await pool.query('SELECT name, is_active FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentlyActive = userResult.rows[0].is_active !== false;
    const newState = !currentlyActive;

    await pool.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newState, id]
    );

    const action = newState ? 'reactivated' : 'deactivated';
    res.json({ message: `User "${userResult.rows[0].name}" has been ${action}.`, is_active: newState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get engineer workload — open ticket counts per engineer (admin only)
router.get('/workload', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(t.id) FILTER (WHERE t.status = 'open')                    AS open_count,
        COUNT(t.id) FILTER (WHERE t.status = 'in_progress')             AS in_progress_count,
        COUNT(t.id) FILTER (WHERE t.status = 'waiting_for_approval')    AS waiting_count,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','voided') AND t.due_at < NOW()) AS overdue_count,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','voided')) AS total_active
      FROM users u
      LEFT JOIN tickets t ON t.assigned_to = u.id
      WHERE u.role IN ('engineer','admin') AND COALESCE(u.is_active, TRUE) = TRUE
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY total_active DESC, u.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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

// Import users from CSV or Excel (admin only)
// Expected columns (case-insensitive): name, email, password (optional), role (optional)
// If password is blank and auto_password=true, generates one automatically
router.post('/import', authMiddleware, adminOnly, importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const autoPassword = req.body.auto_password === 'true';
    const defaultRole = ['user', 'engineer', 'admin'].includes(req.body.default_role)
      ? req.body.default_role
      : 'user';

    // ── Parse file into rows ──────────────────────────────────────────────
    let rows = [];
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      const text = req.file.buffer.toString('utf8');
      rows = parseCsv(text, {
        columns: true,        // first row = headers
        skip_empty_lines: true,
        trim: true
      });
    } else {
      // xlsx / xls
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) return res.status(400).json({ error: 'Excel file has no sheets.' });

      const headers = [];
      sheet.getRow(1).eachCell(cell => headers.push(String(cell.value || '').trim().toLowerCase()));

      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // skip header
        const obj = {};
        row.eachCell((cell, colNum) => {
          const key = headers[colNum - 1];
          if (key) obj[key] = cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
        });
        if (Object.values(obj).some(v => v !== '')) rows.push(obj);
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty or has no data rows.' });
    }

    // ── Normalise column names (case-insensitive) ─────────────────────────
    const normalise = (row) => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        out[k.toLowerCase().trim()] = typeof v === 'string' ? v.trim() : String(v || '').trim();
      }
      return out;
    };

    // ── Process each row ──────────────────────────────────────────────────
    const results = { created: [], skipped: [], errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = normalise(rows[i]);
      const rowNum = i + 2; // +2 because row 1 is header

      const name = row['name'] || row['full name'] || row['fullname'] || '';
      const email = row['email'] || row['login'] || row['login id'] || '';
      let password = row['password'] || row['pass'] || '';
      const role = ['user', 'engineer', 'admin'].includes(row['role'])
        ? row['role']
        : defaultRole;

      // Validate required fields
      if (!name) { results.errors.push({ row: rowNum, reason: 'Missing name' }); continue; }
      if (!email) { results.errors.push({ row: rowNum, reason: 'Missing email' }); continue; }

      // Auto-generate password if blank and option is set
      let generatedPassword = null;
      if (!password) {
        if (autoPassword) {
          generatedPassword = Math.random().toString(36).slice(2, 10) +
            Math.random().toString(36).slice(2, 6).toUpperCase() + '!';
          password = generatedPassword;
        } else {
          results.errors.push({ row: rowNum, email, reason: 'Missing password (or enable auto-generate)' });
          continue;
        }
      }

      if (password.length < 6) {
        results.errors.push({ row: rowNum, email, reason: 'Password too short (min 6 characters)' });
        continue;
      }

      try {
        const hashedPassword = await bcryptjs.hash(password, 10);
        const result = await pool.query(
          'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
          [email, hashedPassword, name, role]
        );
        results.created.push({
          ...result.rows[0],
          generated_password: generatedPassword // null if password was provided
        });
      } catch (err) {
        if (err.code === '23505') {
          results.skipped.push({ row: rowNum, email, reason: 'Email already exists' });
        } else {
          results.errors.push({ row: rowNum, email, reason: err.message });
        }
      }
    }

    res.json({
      message: results.created.length + ' user(s) imported successfully.',
      created: results.created,
      skipped: results.skipped,
      errors: results.errors
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
});

module.exports = router;
