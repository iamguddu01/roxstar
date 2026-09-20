const db = require('../db');

const playerModel = {
  async addOrUpdatePlayer(roomId, userId, socketId = null, isOnline = true) {
    const result = await db.query(
      `INSERT INTO room_players (room_id, user_id, socket_id, is_online, joined_at, last_seen_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (room_id, user_id)
       DO UPDATE SET
         socket_id = COALESCE($3, room_players.socket_id),
         is_online = $4,
         last_seen_at = CURRENT_TIMESTAMP
       RETURNING id, room_id, user_id, socket_id, is_online, joined_at, last_seen_at`,
      [roomId, userId, socketId, isOnline]
    );
    return result.rows[0];
  },

  async getPlayersInRoom(roomId) {
    const result = await db.query(
      `SELECT rp.id, rp.room_id, rp.user_id, rp.socket_id, rp.is_online, rp.joined_at, rp.last_seen_at,
              u.username
       FROM room_players rp
       JOIN users u ON rp.user_id = u.id
       WHERE rp.room_id = $1
       ORDER BY rp.is_online DESC, rp.joined_at ASC`,
      [roomId]
    );
    return result.rows;
  },

  async setPlayerOnlineStatus(roomId, userId, isOnline, socketId = null) {
    const result = await db.query(
      `UPDATE room_players
       SET is_online = $3,
           socket_id = COALESCE($4, socket_id),
           last_seen_at = CURRENT_TIMESTAMP
       WHERE room_id = $1 AND user_id = $2
       RETURNING id, room_id, user_id, is_online, socket_id`,
      [roomId, userId, isOnline, socketId]
    );
    return result.rows[0] || null;
  },

  async setPlayerOfflineBySocketId(socketId) {
    const result = await db.query(
      `UPDATE room_players
       SET is_online = false,
           last_seen_at = CURRENT_TIMESTAMP
       WHERE socket_id = $1
       RETURNING id, room_id, user_id, socket_id`,
      [socketId]
    );
    return result.rows;
  },
};

module.exports = playerModel;
