require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');
const password = 'admin123';
const email = 'admin@ticketing.local';
const name = 'Admin User';

bcrypt.hash(password, 10)
  .then(hash => pool.query('INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id', [email, hash, name, 'admin']))
  .then(res => {
    console.log('created', res.rows[0]);
    return pool.end();
  })
  .catch(err => {
    console.error(err.message);
    pool.end();
    process.exit(1);
  });
