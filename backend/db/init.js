const pool = require('./pool');

const initializeDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES categories(id),
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'open',
        voided_reason TEXT,
        created_by INTEGER REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        due_at TIMESTAMP
      );
    `);

    // Create comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create attachments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        path VARCHAR(500) NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default categories if they don't exist
    await pool.query(`
      INSERT INTO categories (name, description)
      VALUES
        ('Hardware', 'Computer hardware issues'),
        ('Software', 'Software installation or configuration'),
        ('Network', 'Network connectivity problems'),
        ('Security', 'Security concerns or access issues'),
        ('Other', 'Other types of issues')
      ON CONFLICT (name) DO NOTHING
    `);

    // ── Migrations (safe to run repeatedly) ──────────────────────────────────

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255)`);
    await pool.query(`ALTER TABLE tickets ALTER COLUMN created_by DROP NOT NULL`);
    await pool.query(`ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preference VARCHAR(20) DEFAULT 'all'`);
    await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS voided_reason TEXT`);
    await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_at TIMESTAMP`);

    // Backfill due_at for existing open/active tickets
    await pool.query(`
      UPDATE tickets SET due_at =
        CASE priority
          WHEN 'high'   THEN created_at + INTERVAL '4 hours'
          WHEN 'medium' THEN created_at + INTERVAL '24 hours'
          WHEN 'low'    THEN created_at + INTERVAL '72 hours'
          ELSE               created_at + INTERVAL '24 hours'
        END
      WHERE due_at IS NULL AND status NOT IN ('resolved', 'voided')
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

module.exports = { initializeDatabase, pool };
