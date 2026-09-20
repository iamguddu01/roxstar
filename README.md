# Roxstar - Multiplayer Spin Wheel Game (Web)

A full-stack, real-time multiplayer spin wheel web application built with **React, Node.js, Express, Socket.IO, and PostgreSQL**. Users can create and join game rooms, chat live with other players, and participate in synchronized prize wheel spins with server-authoritative locking and database persistence.

---

## Documentation Index

For in-depth architectural and operational guides, refer to the documentation inside the [`/docs`](docs/) directory:

| Document | Description |
| :--- | :--- |
| [**Project Overview**](docs/PROJECT_OVERVIEW.md) | Features, tech stack details, and complete project folder structure |
| [**System Architecture**](docs/ARCHITECTURE.md) | Sequence diagrams, room lifecycle, spin wheel workflow and concurrency lock |
| [**Database Schema**](docs/DATABASE_SCHEMA.md) | Relational ER diagrams (Mermaid and ASCII), tables, keys and constraints |
| [**REST API Documentation**](docs/API_DOCUMENTATION.md) | Complete reference for all REST endpoints with sample request/response payloads |
| [**Socket.IO Events**](docs/SOCKET_EVENTS.md) | Catalog of all client/server WebSocket events, payloads and disconnect handling |
| [**Deployment Guide**](docs/DEPLOYMENT.md) | Step-by-step local setup, Render cloud deployment, and production guidelines |
| [**Docker & Compose**](docs/DOCKER.md) | Docker architecture, container builds, Docker Compose commands and volume reset |

---

## Quick Overview

- **Frontend**: React 19, Vite, Vanilla CSS (balanced dark-slate theme, 100% solid badges, responsive layout), Web Audio API synthesizer.
- **Backend**: Node.js, Express 4, modular architecture (controllers, models, routes).
- **Real-Time Engine**: Socket.IO with isolated room channels and in-memory spin concurrency mutex.
- **Persistence**: PostgreSQL 17 storing users, rooms, memberships, chat messages, and spin logs.
- **Cloud & DevOps**: Lightweight `GET /health` check, `.env` parameterization, Render deployment readiness, and Docker Compose orchestration.

---

## Environment Variables

The project includes template environment files:
- Root template: [`.env.example`](.env.example)
- Server template: [`server/.env.example`](server/.env.example)

Key variables:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spinwheel_db
CLIENT_URL=http://localhost:5173
```

---

## Local Installation

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+ running on port `5432`)

### 2. Database Setup
```bash
psql -U postgres -c "CREATE DATABASE spinwheel_db;"
```

### 3. Backend Setup & Migrations
```bash
cd server
cp .env.example .env
npm install
npm run db:migrate
```

### 4. Run Automated Tests
```bash
npm test
```
*Executes [test-socket-flow.js](server/test-socket-flow.js) verifying room creation, socket events, spin concurrency locking, and database records.*

### 5. Start Servers
```bash
# Start backend (http://localhost:5000)
cd server && npm run dev

# Start frontend in separate terminal (http://localhost:5173)
cd client && npm install && npm run dev
```

---

## Docker Setup

Run the full stack (Node.js Express backend + PostgreSQL 17) with one command:

```bash
# Build and run containers in background
docker compose up -d --build

# View logs
docker compose logs -f

# Verify health endpoint
curl http://localhost:5000/health
# Response: {"status":"OK"}

# Stop containers
docker compose down
```

See [**Docker Guide**](docs/DOCKER.md) for full containerization details.

---

## Deployment

### Render (Backend & PostgreSQL)
1. Provision a **PostgreSQL** database on Render.
2. Create a **Web Service** pointing to the `server/` directory.
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm run db:migrate && npm start`
   - **Health Check Path**: `/health`
   - **Environment Variables**: Set `DATABASE_URL` and `CLIENT_URL`.

See [**Deployment Guide**](docs/DEPLOYMENT.md) for step-by-step production instructions.

---

## Health Check Endpoints

- `GET /health`: Lightweight fast health check returning `{"status": "OK"}` (no database query required).
- `GET /api/health`: Comprehensive health check with database query execution and timestamp validation.
