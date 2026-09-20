const db = require('../db');

function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const roomModel = {
  async createRoom(name, createdByUserId) {
    let attempts = 0;
    while (attempts < 10) {
      const code = generateRoomCode(6);
      try {
        const result = await db.query(
          `INSERT INTO rooms (room_code, name, created_by)
           VALUES ($1, $2, $3)
           RETURNING id, room_code, name, created_by, is_active, created_at`,
          [code, name || 'Prize Wheel Room', createdByUserId]
        );
        return result.rows[0];
      } catch (err) {
        // Retry if collision occurs
        if (err.code === '23505') {
          attempts++;
        } else {
          throw err;
        }
      }
    }
    throw new Error('Failed to generate a unique room code.');
  },

  async findByCode(roomCode) {
    const result = await db.query(
      `SELECT r.id, r.room_code, r.name, r.created_by, r.is_active, r.created_at,
              u.username AS creator_username
       FROM rooms r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE UPPER(r.room_code) = UPPER($1)`,
      [roomCode.trim()]
    );
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await db.query(
      `SELECT id, room_code, name, created_by, is_active, created_at
       FROM rooms
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getRecentActiveRooms(limit = 10) {
    const result = await db.query(
      `SELECT r.id, r.room_code, r.name, r.created_at,
              COUNT(DISTINCT rp.user_id) FILTER (WHERE rp.is_online = true) AS active_players_count,
              u.username AS creator_name
       FROM rooms r
       LEFT JOIN room_players rp ON r.id = rp.room_id
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.is_active = true
       GROUP BY r.id, u.username
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },
};

module.exports = roomModel;
