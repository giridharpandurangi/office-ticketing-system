const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check is_active — wrapped separately so a DB error never blocks login
  try {
    const result = await pool.query(
      'SELECT COALESCE(is_active, TRUE) as is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length > 0 && result.rows[0].is_active === false) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact your administrator.' });
    }
  } catch (dbErr) {
    // Log but don't block — column may not exist yet during first migration
    console.warn('authMiddleware: is_active check failed, allowing through:', dbErr.message);
  }

  req.user = decoded;
  next();
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
