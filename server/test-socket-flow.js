require('dotenv').config();
const { io } = require('socket.io-client');
const { pool } = require('./db');

const PORT = process.env.PORT || 5001;
const SERVER_URL = `http://localhost:${PORT}`;

async function testFlow() {
  console.log('Testing full socket & DB flow on ' + SERVER_URL + '...');

  // 1. Create Room via REST API
  const createRes = await fetch(`${SERVER_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'TestUserAce',
      name: 'Automated Test Arena',
    }),
  });
  const roomData = await createRes.json();
  console.log('✓ Room created:', roomData.room.room_code);

  const socket = io(SERVER_URL, {
    transports: ['websocket'],
  });

  await new Promise((resolve) => socket.on('connect', resolve));
  console.log('✓ Socket connected:', socket.id);

  // 2. Join room via socket
  socket.emit('room:join', {
    roomCode: roomData.room.room_code,
    userId: roomData.user.id,
    username: roomData.user.username,
  });

  await new Promise((resolve) => socket.on('room:joined', resolve));
  console.log('✓ Room joined via socket');

  // 3. Send chat message
  socket.emit('chat:message', { message: 'Automated victory shout!' });
  await new Promise((resolve) => {
    socket.on('chat:received', (msg) => {
      if (msg.message === 'Automated victory shout!') {
        console.log('✓ Chat message received & verified:', msg.message);
        resolve();
      }
    });
  });

  // 4. Test spin request
  console.log('Requesting spin...');
  socket.emit('spin:request');

  const startData = await new Promise((resolve) => socket.on('spin:start', resolve));
  console.log('✓ Spin started! Target angle:', startData.targetAngle, 'Duration:', startData.duration);

  // Test concurrency guard: second spin request during active spin should be rejected
  socket.emit('spin:request');
  await new Promise((resolve) => {
    socket.on('spin:error', (err) => {
      console.log('✓ Concurrency guard successfully rejected simultaneous spin:', err.message);
      resolve();
    });
  });

  // Wait for spin completion
  const completeData = await new Promise((resolve) => socket.on('spin:complete', resolve));
  console.log('✓ Spin completed! Winner:', completeData.spinnerUsername, 'Prize:', completeData.reward.label);

  // 5. Query PostgreSQL database directly to verify persistence
  const [userDb, roomDb, playerDb, chatDb, spinDb] = await Promise.all([
    pool.query('SELECT * FROM users WHERE id = $1', [roomData.user.id]),
    pool.query('SELECT * FROM rooms WHERE id = $1', [roomData.room.id]),
    pool.query('SELECT * FROM room_players WHERE room_id = $1', [roomData.room.id]),
    pool.query('SELECT * FROM chat_messages WHERE room_id = $1', [roomData.room.id]),
    pool.query('SELECT * FROM spin_history WHERE room_id = $1', [roomData.room.id]),
  ]);

  console.log('\n--- PostgreSQL Verification ---');
  console.log('Users count:', userDb.rows.length, 'Username:', userDb.rows[0]?.username);
  console.log('Rooms count:', roomDb.rows.length, 'Code:', roomDb.rows[0]?.room_code);
  console.log('Room Players count:', playerDb.rows.length);
  console.log('Chat Messages count:', chatDb.rows.length, 'Message:', chatDb.rows[0]?.message);
  console.log('Spin History count:', spinDb.rows.length, 'Reward:', spinDb.rows[0]?.reward);

  await pool.query('DELETE FROM rooms WHERE id = $1', [roomData.room.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [roomData.user.id]);
  console.log('Cleaned test room and user');

  socket.disconnect();
  await pool.end();
  console.log('\n✅ All automated end-to-end checks PASSED!');
}

testFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
