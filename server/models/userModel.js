const db = require('../db');

const userModel = {
  async findOrCreate(username) {
    const trimmed = username.trim();
    const existing = await db.query(
      'SELECT id, username, created_at FROM users WHERE LOWER(username) = LOWER($1)',
      [trimmed]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    const result = await db.query(
      'INSERT INTO users (username) VALUES ($1) RETURNING id, username, created_at',
      [trimmed]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      'SELECT id, username, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByUsername(username) {
    const result = await db.query(
      'SELECT id, username, created_at FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    return result.rows[0] || null;
  },
};

module.exports = userModel;
