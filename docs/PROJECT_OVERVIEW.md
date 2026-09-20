# Project Overview

## 1. Project Objective

**Roxstar** is a real-time multiplayer spin wheel web application designed for synchronized gaming experiences. The platform allows users to create dedicated game arenas or join existing ones using unique 6-character room codes. Players inside the same room can chat in real time, monitor active participants, and participate in synchronized prize wheel spins.

The engineering focus centers on:
- **Real-Time Synchronization**: WebSocket communication using Socket.IO so all players in a room observe the prize wheel decelerate and land on the exact same prize simultaneously.
- **Concurrency and State Safety**: An in-memory mutex prevents race conditions, ensuring only one spin can happen in a room at any given moment.
- **Relational Data Integrity**: Complete persistence of users, rooms, memberships, chat messages, and spin logs in PostgreSQL with strict foreign keys and cascading rules.
- **Modular Architecture**: Clear separation of concerns between models, controllers, routes, and socket handlers in vanilla JavaScript.

---

## 2. Core Features

### Room System
- **Create Room**: Users can host an arena with a custom name. A unique 6-character alphanumeric room code is automatically generated.
- **Join Room**: Players can join any active room using its code or through the public room browser.
- **Real-Time Presence**: The system tracks connections and disconnections via socket identifiers, broadcasting online and offline changes dynamically.
- **Host Privileges**: Room creators are visually designated with a Host badge.

### Real-Time Chat
- **Room-Scoped Messaging**: Messages are routed exclusively to players in the current room.
- **Sender Metadata**: Every message displays the sender's username, formatted timestamp, and distinct styling.
- **System Announcements**: Automated alerts announce when players join, leave, initiate a spin, or win a prize.
- **Database Backed**: Chat history is persisted and fetched when a player connects.

### Shared Spin Wheel
- **Single Shared Wheel**: One synchronized wheel per room.
- **Atomic Concurrency Lock**: Server-side mutex rejects simultaneous spin attempts with descriptive error responses.
- **Server-Authoritative Outcome**: The winning prize is selected on the server using weighted random distribution; clients only execute the visual animation.
- **Synchronized Visual Physics**: All connected clients receive identical target angles and duration (5000ms), running synchronized cubic easing animations.
- **Audio Feedback**: Synthesized ticks and victory fanfares via browser Web Audio API without relying on external media files.
- **Spin History**: Every completed spin is logged with room ID, user ID, prize name, and timestamp.

### Backend REST APIs
- RESTful endpoints for room lifecycle, player lookups, spin history, and chat recovery.
- Zero-dependency lightweight health check (`GET /health`) returning `{"status": "OK"}`.

### PostgreSQL Relational Storage
- Five dedicated relational tables (`users`, `rooms`, `room_players`, `chat_messages`, `spin_history`).
- Automated schema migrations via `npm run db:migrate` and Docker entrypoint scripts.

---

## 3. Tech Stack

| Layer | Technology | Specification / Role |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + Vite | Component hierarchy, dynamic rendering, and production bundling |
| **Styling** | Vanilla CSS | Custom dark-slate theme, responsive layouts, 100% solid status badges |
| **Backend Framework** | Node.js + Express 4 | REST routing, middleware, controllers, error handling |
| **Real-Time Communication** | Socket.IO 4 | WebSocket transport, room channels, bidirectional event streaming |
| **Database** | PostgreSQL 17 | Relational persistence, constraints, foreign key cascades, indexing |
| **Audio Engine** | Web Audio API | Client-side oscillator-based sound synthesizer (ticks, fanfare) |
| **Containerization** | Docker and Docker Compose | Multi-container deployment for Node.js server and PostgreSQL |

---

## 4. Folder Structure

```
roxstar assessment 2/
├── client/                         # React + Vite Frontend Application
│   ├── public/                     # Static public assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatBox.jsx         # Live chat feed and message composer
│   │   │   ├── ChatBox.css
│   │   │   ├── GameRoom.jsx        # Stage and sidebar layout
│   │   │   ├── GameRoom.css
│   │   │   ├── Lobby.jsx           # Nickname selection, create/join room, active rooms
│   │   │   ├── Lobby.css
│   │   │   ├── PlayerList.jsx      # Connected player directory and presence indicators
│   │   │   ├── PlayerList.css
│   │   │   ├── RoomHeader.jsx      # Navigation bar, code copying, leave button
│   │   │   ├── RoomHeader.css
│   │   │   ├── SpinHistory.jsx     # Room spin outcome timeline
│   │   │   ├── SpinHistory.css
│   │   │   ├── SpinWheel.jsx       # Canvas physics wheel and indicator ticker
│   │   │   └── SpinWheel.css
│   │   ├── utils/
│   │   │   └── audio.js            # Synthesized Web Audio API sound manager
│   │   ├── App.jsx                 # Root component with Socket.IO state machine
│   │   ├── App.css
│   │   ├── index.css               # Core design tokens and solid badge utility classes
│   │   └── main.jsx                # Application DOM mounting
│   ├── index.html                  # HTML entry point (no favicon, clean title)
│   ├── package.json
│   └── vite.config.js
├── server/                         # Express + Socket.IO Backend Application
│   ├── config/
│   │   └── rewards.js              # Wheel prize definitions, colors, and weights
│   ├── controllers/
│   │   ├── roomController.js       # Room creation, joining, and listing controllers
│   │   └── userController.js       # User login and registration controllers
│   ├── db/
│   │   ├── index.js                # PostgreSQL connection pool with Render SSL support
│   │   ├── schema.sql              # Database DDL schema and index definitions
│   │   └── migrate.js              # Automated migration execution script
│   ├── models/
│   │   ├── chatModel.js            # Queries for chat_messages table
│   │   ├── playerModel.js          # Queries for room_players table
│   │   ├── roomModel.js            # Queries for rooms table and code generation
│   │   ├── spinModel.js            # Queries for spin_history table
│   │   └── userModel.js            # Queries for users table
│   ├── routes/
│   │   ├── roomRoutes.js           # Express router for /api/rooms endpoints
│   │   └── userRoutes.js           # Express router for /api/users endpoints
│   ├── sockets/
│   │   └── index.js                # Socket.IO room lifecycle and spin concurrency handler
│   ├── .dockerignore               # Files excluded from Docker image builds
│   ├── .env                        # Local development environment configuration
│   ├── .env.example                # Template for environment variables
│   ├── Dockerfile                  # Lightweight Alpine production container definition
│   ├── package.json
│   ├── server.js                   # Application server entry point and socket initialization
│   └── test-socket-flow.js         # Automated end-to-end socket and database verification test
├── docs/                           # Dedicated Project Documentation
│   ├── PROJECT_OVERVIEW.md         # High-level architecture and feature summary
│   ├── ARCHITECTURE.md             # System flow, room lifecycle and spin concurrency
│   ├── DATABASE_SCHEMA.md          # ER diagram, table definitions and relationships
│   ├── API_DOCUMENTATION.md        # Comprehensive REST endpoints documentation
│   ├── SOCKET_EVENTS.md            # Socket.IO bidirectional event catalog
│   ├── DEPLOYMENT.md               # Local, Render and production deployment instructions
│   └── DOCKER.md                   # Container architecture, commands and Compose guide
├── .env.example                    # Root environment variable template
├── docker-compose.yml              # Multi-container orchestration (Backend + PostgreSQL)
└── README.md                       # Documentation index and project quickstart
```
