const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if account is still active
    // Use COALESCE so NULL (pre-migration rows) is treated as active
    const result = await pool.query(
      'SELECT COALESCE(is_active, TRUE) as is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (result.rows[0].is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact your administrator.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    // If the is_active column doesn't exist yet (migration pending), allow through
    if (err.message && err.message.includes('is_active')) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

const engineerOnly = (req, res, next) => {
  if (req.user.role !== 'engineer') {
    return res.status(403).json({ error: 'Access denied. Engineers only.' });
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

module.exports = { authMiddleware, engineerOnly, adminOnly };
