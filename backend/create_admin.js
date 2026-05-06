require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');
const { initializeDatabase } = require('./db/init');

const email    = 'admin@ticketing.local';
const password = 'admin123';
const name     = 'Admin User';

initializeDatabase()
  .then(() => bcrypt.hash(password, 10))
  .then(hash =>
    pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, hash, name, 'admin']
    )
  )
  .then(res => {
    console.log('Admin user created:', res.rows[0]);
    return pool.end();
  })
  .catch(err => {
    console.error(err.message);
    pool.end();
    process.exit(1);
  });
