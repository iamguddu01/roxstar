const db = require('../db');

const chatModel = {
  async saveMessage(roomId, userId, message) {
    const result = await db.query(
      `INSERT INTO chat_messages (room_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, user_id, message, created_at`,
      [roomId, userId, message]
    );
    const saved = result.rows[0];
    // Fetch sender username
    const userRes = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    return {
      ...saved,
      username: userRes.rows[0]?.username || 'Unknown',
    };
  },

  async getMessagesByRoomId(roomId, limit = 50) {
    const result = await db.query(
      `SELECT cm.id, cm.room_id, cm.user_id, cm.message, cm.created_at,
              u.username
       FROM chat_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.room_id = $1
       ORDER BY cm.created_at ASC
       LIMIT $2`,
      [roomId, limit]
    );
    return result.rows;
  },
};

module.exports = chatModel;
