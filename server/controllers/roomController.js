const roomModel = require('../models/roomModel');
const userModel = require('../models/userModel');
const playerModel = require('../models/playerModel');
const spinModel = require('../models/spinModel');
const chatModel = require('../models/chatModel');
const { REWARDS } = require('../config/rewards');

const roomController = {
  // POST /api/rooms - Create room
  async createRoom(req, res) {
    try {
      const { name, username } = req.body;
      if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username is required to create a room.' });
      }

      const user = await userModel.findOrCreate(username.trim());
      const roomName = (name && name.trim()) ? name.trim() : `${user.username}'s Arena`;
      const room = await roomModel.createRoom(roomName, user.id);

      // Add creator as player in room
      await playerModel.addOrUpdatePlayer(room.id, user.id, null, true);

      return res.status(201).json({
        success: true,
        message: 'Room created successfully',
        room: {
          ...room,
          creator_username: user.username,
        },
        user,
      });
    } catch (err) {
      console.error('Error creating room:', err);
      return res.status(500).json({ error: 'Failed to create room.' });
    }
  },

  // POST /api/rooms/join - Join existing room
  async joinRoom(req, res) {
    try {
      const { roomCode, username } = req.body;
      if (!roomCode || !roomCode.trim()) {
        return res.status(400).json({ error: 'Room code is required.' });
      }
      if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username is required.' });
      }

      const room = await roomModel.findByCode(roomCode.trim());
      if (!room) {
        return res.status(404).json({ error: 'Room not found. Please verify the code.' });
      }
      if (!room.is_active) {
        return res.status(400).json({ error: 'This room is no longer active.' });
      }

      const user = await userModel.findOrCreate(username.trim());
      await playerModel.addOrUpdatePlayer(room.id, user.id, null, true);

      return res.status(200).json({
        success: true,
        message: 'Joined room successfully',
        room,
        user,
      });
    } catch (err) {
      console.error('Error joining room:', err);
      return res.status(500).json({ error: 'Failed to join room.' });
    }
  },

  // GET /api/rooms/:code - Room details
  async getRoomDetails(req, res) {
    try {
      const { code } = req.params;
      const room = await roomModel.findByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      const players = await playerModel.getPlayersInRoom(room.id);
      return res.status(200).json({
        success: true,
        room,
        onlineCount: players.filter((p) => p.is_online).length,
        totalPlayers: players.length,
      });
    } catch (err) {
      console.error('Error fetching room details:', err);
      return res.status(500).json({ error: 'Failed to fetch room details.' });
    }
  },

  // GET /api/rooms/:code/players - Players in room
  async getPlayers(req, res) {
    try {
      const { code } = req.params;
      const room = await roomModel.findByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      const players = await playerModel.getPlayersInRoom(room.id);
      return res.status(200).json({ success: true, players });
    } catch (err) {
      console.error('Error fetching room players:', err);
      return res.status(500).json({ error: 'Failed to fetch room players.' });
    }
  },

  // GET /api/rooms/:code/spins - Spin history
  async getSpinHistory(req, res) {
    try {
      const { code } = req.params;
      const limit = parseInt(req.query.limit || '50', 10);
      const room = await roomModel.findByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      const spins = await spinModel.getSpinsByRoomId(room.id, limit);
      return res.status(200).json({ success: true, spins });
    } catch (err) {
      console.error('Error fetching spin history:', err);
      return res.status(500).json({ error: 'Failed to fetch spin history.' });
    }
  },

  // GET /api/rooms/:code/messages - Chat messages
  async getChatHistory(req, res) {
    try {
      const { code } = req.params;
      const room = await roomModel.findByCode(code);
      if (!room) {
        return res.status(404).json({ error: 'Room not found.' });
      }
      const messages = await chatModel.getMessagesByRoomId(room.id, 50);
      return res.status(200).json({ success: true, messages });
    } catch (err) {
      console.error('Error fetching chat history:', err);
      return res.status(500).json({ error: 'Failed to fetch chat history.' });
    }
  },

  // GET /api/rooms - List active rooms
  async getPublicRooms(req, res) {
    try {
      const rooms = await roomModel.getRecentActiveRooms(15);
      return res.status(200).json({ success: true, rooms });
    } catch (err) {
      console.error('Error fetching public rooms:', err);
      return res.status(500).json({ error: 'Failed to fetch rooms.' });
    }
  },

  // GET /api/rewards - Wheel rewards metadata
  getRewardsConfig(req, res) {
    return res.status(200).json({ success: true, rewards: REWARDS });
  },
};

module.exports = roomController;
