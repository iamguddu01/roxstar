const roomModel = require('../models/roomModel');
const playerModel = require('../models/playerModel');
const chatModel = require('../models/chatModel');
const spinModel = require('../models/spinModel');
const userModel = require('../models/userModel');
const { REWARDS, getRandomReward } = require('../config/rewards');

// Map of roomId -> { isSpinning: boolean, spinner: object, endTimeout: timer }
const activeRoomSpins = new Map();

function initSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Track room & user on socket instance
    let currentRoomCode = null;
    let currentRoomId = null;
    let currentUserId = null;
    let currentUsername = null;

    // Helper to broadcast active player list in the room
    const broadcastPlayerList = async (roomId, roomCode) => {
      try {
        const players = await playerModel.getPlayersInRoom(roomId);
        io.to(roomCode).emit('room:players_update', {
          players,
          onlineCount: players.filter((p) => p.is_online).length,
        });
      } catch (err) {
        console.error('Error broadcasting player list:', err);
      }
    };

    // 1. Join Room Event
    socket.joinRoomHandler = async ({ roomCode, userId, username }) => {
      try {
        if (!roomCode || !username) {
          socket.emit('error', { message: 'Room code and username required.' });
          return;
        }

        const room = await roomModel.findByCode(roomCode);
        if (!room) {
          socket.emit('room:error', { message: 'Room not found.' });
          return;
        }

        let user;
        if (userId) {
          user = await userModel.findById(userId);
        }
        if (!user) {
          user = await userModel.findOrCreate(username);
        }

        currentRoomCode = room.room_code;
        currentRoomId = room.id;
        currentUserId = user.id;
        currentUsername = user.username;

        // Join Socket.io room channel
        socket.join(currentRoomCode);

        // Update DB player status to online with socket id
        await playerModel.addOrUpdatePlayer(room.id, user.id, socket.id, true);

        // Notify client of successful room join
        socket.emit('room:joined', {
          room,
          user,
          isSpinning: activeRoomSpins.has(room.id),
          currentSpin: activeRoomSpins.get(room.id) || null,
        });

        // Notify others in the room
        socket.to(currentRoomCode).emit('room:player_joined', {
          user: { id: user.id, username: user.username },
          message: `${user.username} has entered the arena!`,
          timestamp: new Date().toISOString(),
        });

        // Broadcast updated player list
        await broadcastPlayerList(room.id, currentRoomCode);
      } catch (err) {
        console.error('Error in room:join handler:', err);
        socket.emit('room:error', { message: 'Failed to join room.' });
      }
    };

    socket.on('room:join', socket.joinRoomHandler);

    // 2. Real-Time Chat Message
    socket.on('chat:message', async (data) => {
      try {
        const text = typeof data === 'string' ? data : data.message;
        if (!text || !text.trim()) return;

        if (!currentRoomId || !currentRoomCode || !currentUserId) {
          socket.emit('error', { message: 'You are not in an active room.' });
          return;
        }

        const trimmed = text.trim();
        const savedMessage = await chatModel.saveMessage(currentRoomId, currentUserId, trimmed);

        // Broadcast to everyone in the room (including sender)
        io.to(currentRoomCode).emit('chat:received', {
          id: savedMessage.id,
          roomId: currentRoomId,
          userId: currentUserId,
          username: currentUsername,
          message: savedMessage.message,
          created_at: savedMessage.created_at,
        });
      } catch (err) {
        console.error('Error in chat:message handler:', err);
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    // 3. Spin Wheel Event
    socket.on('spin:request', async () => {
      try {
        if (!currentRoomId || !currentRoomCode || !currentUserId) {
          socket.emit('spin:error', { message: 'You must be in a room to spin.' });
          return;
        }

        // Concurrency Guard: check if wheel is already spinning
        if (activeRoomSpins.has(currentRoomId)) {
          socket.emit('spin:error', {
            message: 'Wheel is already spinning! Please wait for the current round to complete.',
          });
          return;
        }

        // Server-authoritative random prize determination
        const { reward, index: sliceIndex } = getRandomReward();
        const spinDurationMs = 5000; // 5 seconds spin animation
        const totalSlices = REWARDS.length;
        const sliceAngle = 360 / totalSlices;

        // Calculate target rotation angle (5 full revolutions + slice alignment offset)
        // With pointer at top (270 deg or 0 deg depending on canvas coordinate),
        // we add full rotations so every client has identical visual physics:
        const fullRotations = 5 * 360;
        // Center of slice:
        const sliceCenterOffset = sliceAngle / 2;
        const slicePosition = sliceIndex * sliceAngle + sliceCenterOffset;
        // Pointer is at top (270 degrees in standard coordinate or 0 at 12 o'clock)
        // Target angle formula ensures top pointer lands squarely in slice
        const targetAngle = fullRotations + (360 - slicePosition);

        const spinState = {
          roomId: currentRoomId,
          spinnerId: currentUserId,
          spinnerUsername: currentUsername,
          reward,
          sliceIndex,
          targetAngle,
          duration: spinDurationMs,
          startedAt: Date.now(),
        };

        // Lock room wheel
        activeRoomSpins.set(currentRoomId, spinState);

        // Broadcast spin initiation to all connected players in the room
        io.to(currentRoomCode).emit('spin:start', {
          spinnerId: currentUserId,
          spinnerUsername: currentUsername,
          rewardId: reward.id,
          sliceIndex,
          targetAngle,
          duration: spinDurationMs,
          timestamp: new Date().toISOString(),
        });

        // Broadcast chat system announcement
        io.to(currentRoomCode).emit('chat:received', {
          id: `sys-${Date.now()}`,
          isSystem: true,
          message: `🎰 ${currentUsername} is spinning the prize wheel!`,
          created_at: new Date().toISOString(),
        });

        // Set timer for spin completion on server
        const timeout = setTimeout(async () => {
          try {
            // Save to database
            const savedSpin = await spinModel.saveSpin(currentRoomId, currentUserId, reward.label);

            // Unlock the wheel
            activeRoomSpins.delete(currentRoomId);

            // Broadcast final outcome
            io.to(currentRoomCode).emit('spin:complete', {
              spinId: savedSpin.id,
              spinnerId: currentUserId,
              spinnerUsername: currentUsername,
              reward,
              created_at: savedSpin.created_at,
            });

            // Announce winner in chat
            io.to(currentRoomCode).emit('chat:received', {
              id: `sys-${Date.now()}`,
              isSystem: true,
              message: `🎉 ${currentUsername} won: ${reward.label}!`,
              created_at: new Date().toISOString(),
            });

            // Fetch and broadcast latest spin history
            const spins = await spinModel.getSpinsByRoomId(currentRoomId, 20);
            io.to(currentRoomCode).emit('spin:history_update', { spins });
          } catch (spinDbErr) {
            console.error('Error saving spin result to DB:', spinDbErr);
            activeRoomSpins.delete(currentRoomId);
            io.to(currentRoomCode).emit('spin:error', { message: 'Failed to record spin.' });
          }
        }, spinDurationMs);

        spinState.endTimeout = timeout;
      } catch (err) {
        console.error('Error handling spin:request:', err);
        activeRoomSpins.delete(currentRoomId);
        socket.emit('spin:error', { message: 'An error occurred during spin.' });
      }
    });

    // 4. Leave Room Event
    socket.on('room:leave', async () => {
      if (currentRoomId && currentUserId && currentRoomCode) {
        try {
          await playerModel.setPlayerOnlineStatus(currentRoomId, currentUserId, false, socket.id);
          socket.to(currentRoomCode).emit('room:player_left', {
            userId: currentUserId,
            username: currentUsername,
            message: `${currentUsername} left the room.`,
            timestamp: new Date().toISOString(),
          });
          socket.leave(currentRoomCode);
          await broadcastPlayerList(currentRoomId, currentRoomCode);
        } catch (err) {
          console.error('Error on room:leave:', err);
        }
      }
      currentRoomCode = null;
      currentRoomId = null;
      currentUserId = null;
      currentUsername = null;
    });

    // 5. Disconnect Event
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      if (socket.id) {
        try {
          const offlinePlayers = await playerModel.setPlayerOfflineBySocketId(socket.id);
          if (currentRoomCode && currentUsername) {
            socket.to(currentRoomCode).emit('room:player_left', {
              userId: currentUserId,
              username: currentUsername,
              message: `${currentUsername} has disconnected.`,
              timestamp: new Date().toISOString(),
            });
            if (currentRoomId) {
              await broadcastPlayerList(currentRoomId, currentRoomCode);
            }
          }
        } catch (err) {
          console.error('Error handling player disconnect:', err);
        }
      }
    });
  });
}

module.exports = { initSockets };
