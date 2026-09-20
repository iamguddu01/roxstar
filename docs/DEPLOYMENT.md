# Deployment Guide

This guide covers local development, environment configuration, production readiness, and deploying the backend to Render and frontend to static hosting platforms.

---

## 1. Local Setup

### Prerequisites
- Node.js: v18 or higher (v22+ recommended)
- PostgreSQL: v14 or higher running on port 5432

### Step 1: Initialize Database
```bash
# Connect to PostgreSQL and create the application database
psql -U postgres -c "CREATE DATABASE spinwheel_db;"
```

### Step 2: Configure Environment
Copy the example environment configuration into `server/.env`:
```bash
cd server
cp .env.example .env
```
Ensure your credentials in `server/.env` match your local PostgreSQL setup:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spinwheel_db
CLIENT_URL=http://localhost:5173
```

### Step 3: Run Database Migrations
```bash
cd server
npm install
npm run db:migrate
```
Creates all 5 tables (`users`, `rooms`, `room_players`, `chat_messages`, `spin_history`) and indexes.

### Step 4: Run Automated Tests
```bash
npm test
```
Verifies socket connections, room creation, chat messages, spin concurrency locking, and database persistence.

### Step 5: Start Servers
- Backend Server:
  ```bash
  cd server
  npm run dev      # Or: npm start
  # Runs on http://localhost:5000
  ```
- Frontend Client (in a separate terminal):
  ```bash
  cd client
  npm install
  npm run dev
  # Runs on http://localhost:5173
  ```

---

## 2. Environment Variables Reference

The backend uses standard `process.env` configuration with fallback values:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `5000` | Port for Express and Socket.IO server |
| `DATABASE_URL` | String | *(null)* | Full PostgreSQL connection URL (e.g. `postgresql://user:pass@host:5432/dbname`) |
| `CLIENT_URL` | String | `http://localhost:5173` | Allowed frontend URL for CORS origin check |
| `NODE_ENV` | String | `development` | Environment mode (`development` or `production`) |
| `DB_USER` | String | `postgres` | Fallback DB user if `DATABASE_URL` is omitted |
| `DB_PASSWORD` | String | `postgres` | Fallback DB password |
| `DB_HOST` | String | `localhost` | Fallback DB host |
| `DB_PORT` | Number | `5432` | Fallback DB port |
| `DB_NAME` | String | `spinwheel_db` | Fallback DB name |

---

## 3. Render Deployment (Production Ready)

The backend is fully configured for zero-dependency deployment on Render. No proprietary SDKs, plugins, or vendor packages are needed.

### 3.1 Step 1: Create a PostgreSQL Database on Render
1. Log in to Render Dashboard (https://dashboard.render.com).
2. Click New + -> PostgreSQL.
3. Name: `spinwheel-db`.
4. Database: `spinwheel_db`.
5. Select the Free tier (or paid).
6. Click Create Database.
7. Once provisioned, copy the Internal Database URL (e.g. `postgresql://user:pass@dpg-xxx:5432/spinwheel_db`).

### 3.2 Step 2: Create a Web Service for Backend
1. In Render Dashboard, click New + -> Web Service.
2. Connect your Git repository.
3. Configure the service settings:
   - Name: `spinwheel-backend`
   - Region: Same region as your database
   - Root Directory: `server`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm run db:migrate && npm start`
4. Add Environment Variables under Environment:
   - `DATABASE_URL`: (Paste the Internal Database URL from Step 1)
   - `CLIENT_URL`: (Your frontend URL, e.g. `https://roxstar.vercel.app` or `*`)
   - `NODE_ENV`: `production`
5. Configure Health Check:
   - Set Health Check Path to `/health`.
6. Click Create Web Service.

Render will install dependencies, run database migrations, verify the `/health` check, and deploy your Express and Socket.IO server.

---

## 4. Frontend Deployment (Vercel / Netlify / Render Static Site)

The frontend is a standard Vite React single-page application.

1. Build Command: `npm run build`
2. Output Directory: `dist`
3. Environment Variable:
   - `VITE_SERVER_URL`: URL of your deployed backend on Render (e.g. `https://spinwheel-backend.onrender.com`).

---

## 5. Production Best Practices Implemented

- Lightweight Health Check (`GET /health`): Provides an instantaneous `200 OK` probe without querying the database, preventing load balancer timeouts during high traffic.
- SSL Auto-Negotiation: When `DATABASE_URL` is set and points to an external cloud database (like Render or AWS RDS), `ssl: { rejectUnauthorized: false }` is automatically engaged.
- Graceful Shutdown: The server listens to `SIGTERM` signals, closes active HTTP/Socket connections, and safely drains the PostgreSQL pool before process termination.
- CORS Handling: Supports both restrictive production origins via `CLIENT_URL` and wildcard development.
