const db = require('../db');

const spinModel = {
  async saveSpin(roomId, userId, reward) {
    const result = await db.query(
      `INSERT INTO spin_history (room_id, user_id, reward)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, user_id, reward, created_at`,
      [roomId, userId, reward]
    );
    const saved = result.rows[0];
    const userRes = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    return {
      ...saved,
      username: userRes.rows[0]?.username || 'Unknown',
    };
  },

  async getSpinsByRoomId(roomId, limit = 50) {
    const result = await db.query(
      `SELECT sh.id, sh.room_id, sh.user_id, sh.reward, sh.created_at,
              u.username
       FROM spin_history sh
       JOIN users u ON sh.user_id = u.id
       WHERE sh.room_id = $1
       ORDER BY sh.created_at DESC
       LIMIT $2`,
      [roomId, limit]
    );
    return result.rows;
  },
};

module.exports = spinModel;
