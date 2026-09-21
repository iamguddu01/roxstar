const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const roomRoutes = require('./routes/roomRoutes');
const userRoutes = require('./routes/userRoutes');
const { initSockets } = require('./sockets');
const { pool } = require('./db');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Spin Wheel Server is running!' });
});

// Lightweight Health Check Endpoint (Render / Load Balancer friendly, no DB call)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Detailed Health Check with Database Connectivity
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      serverTime: new Date().toISOString(),
      databaseTime: dbRes.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initSockets(io);

// Auto-run schema migrations on startup
async function runAutoMigration() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('✅ Database schema verified / migrated successfully!');
  } catch (err) {
    console.error('⚠️ Auto-migration error:', err);
  }
}

// Start Server (bind to 0.0.0.0 for cloud containers)
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Spin Wheel Server running on port ${PORT}`);
  await runAutoMigration();
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and DB pool...');
  server.close(async () => {
    await pool.end();
    console.log('Server and DB pool closed.');
    process.exit(0);
  });
});
