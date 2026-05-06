require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const authRoutes = require('./routes/auth');
const ticketsRoutes = require('./routes/tickets');
const usersRoutes = require('./routes/users');
const categoriesRoutes = require('./routes/categories');
const { initializeDatabase } = require('./db/init');
const { startDailyDigest, sendDigest } = require('./utils/digest');

// Validate JWT_SECRET exists on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_secret_key_here_change_in_production') {
  console.error('FATAL ERROR: JWT_SECRET is not set or is using the default value.');
  console.error('Please set a secure JWT_SECRET in your .env file.');
  process.exit(1);
}

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS — open for local office network use
app.use(cors());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize database
initializeDatabase().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tickets', generalLimiter, ticketsRoutes);
app.use('/api/users', generalLimiter, usersRoutes);
app.use('/api/categories', generalLimiter, categoriesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Manual digest trigger — admin only, for testing
app.post('/api/admin/send-digest', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    await sendDigest();
    res.json({ message: 'Digest sent successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5200;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:3000`);
  startDailyDigest();
});
