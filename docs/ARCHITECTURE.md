# System Architecture

## 1. High-Level System Flow

The application follows an event-driven, client-server architecture. The React frontend interacts with the Node.js backend through two distinct channels:
1. **REST APIs**: Synchronous data retrieval for initial page loads (room metadata, chat archives, spin histories).
2. **WebSocket (Socket.IO)**: Low-latency, bidirectional event streaming for live game actions, player presence, chat broadcasts, and shared wheel rotations.

```mermaid
graph TD
    subgraph Client Layer [Frontend Client - React 19 + Vite]
        UI[User Interface & Canvas Wheel]
        SockClient[Socket.IO Client]
        HTTPClient[Fetch REST Client]
    end

    subgraph Server Layer [Backend Server - Node.js + Express + Socket.IO]
        Router[Express REST Routers /api/rooms & /api/users]
        Health[Health Endpoint /health]
        SocketHandler[Socket.IO Event Handlers]
        SpinLock[In-Memory Room Spin Mutex]
        Controllers[Controllers & Business Logic]
        Models[Data Access Models]
    end

    subgraph Database Layer [Persistence Layer - PostgreSQL 17]
        DB[(PostgreSQL Database)]
        UsersTable[users]
        RoomsTable[rooms]
        PlayersTable[room_players]
        ChatTable[chat_messages]
        SpinTable[spin_history]
    end

    UI --> SockClient
    UI --> HTTPClient

    HTTPClient --> Router
    HTTPClient --> Health
    SockClient <--> SocketHandler

    Router --> Controllers
    Controllers --> Models
    SocketHandler --> SpinLock
    SocketHandler --> Models

    Models --> DB
    DB --- UsersTable
    DB --- RoomsTable
    DB --- PlayersTable
    DB --- ChatTable
    DB --- SpinTable
```

---

## 2. Room Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player (Client)
    participant API as REST API (/api/rooms)
    participant Socket as Socket.IO Server
    participant Lock as In-Memory State
    participant DB as PostgreSQL

    Note over Player, DB: 1. Room Creation
    Player->>API: POST /api/rooms { username, name }
    API->>DB: INSERT INTO users & INSERT INTO rooms
    API->>DB: INSERT INTO room_players (creator, is_online=true)
    API-->>Player: { success: true, room, user }

    Note over Player, DB: 2. WebSocket Connection & Room Joining
    Player->>Socket: emit('room:join', { roomCode, userId, username })
    Socket->>Socket: socket.join(roomCode)
    Socket->>DB: UPDATE room_players SET socket_id, is_online=true
    Socket-->>Player: emit('room:joined', { room, isSpinning })
    Socket->>Socket: Broadcast to room: 'room:player_joined'
    Socket->>DB: SELECT * FROM room_players WHERE room_id = ?
    Socket->>Socket: Broadcast to room: 'room:players_update'

    Note over Player, DB: 3. Room Departure / Disconnect
    alt Explicit Leave
        Player->>Socket: emit('room:leave')
        Socket->>DB: UPDATE room_players SET is_online=false
        Socket->>Socket: Broadcast to room: 'room:player_left'
        Socket->>Socket: socket.leave(roomCode)
    else Sudden Disconnect (Browser Closed)
        Socket->>Socket: on('disconnect')
        Socket->>DB: UPDATE room_players SET is_online=false WHERE socket_id = ?
        Socket->>Socket: Broadcast to room: 'room:player_left'
    end
```

---

## 3. Spin Wheel Workflow & Concurrency Protection

The wheel mechanism is strictly **server-authoritative**. Clients cannot determine the winning reward; they only render an animation based on instructions calculated by the backend.

### Concurrency Protection (Spin Mutex)
When multiple players attempt to spin the wheel at the same time:
1. The server checks an in-memory lock map: `activeRoomSpins.has(roomId)`.
2. If the room is already spinning, the server rejects subsequent requests with a `spin:error` event: `"Wheel is already spinning! Please wait for the current round to complete."`.
3. If the wheel is free, the server acquires the lock, picks the winning slice, broadcasts `spin:start`, and starts a server-side completion timer (5000ms).

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Player Alice
    actor Bob as Player Bob
    participant Server as Socket.IO Server
    participant Mutex as activeRoomSpins Map
    participant DB as PostgreSQL

    Alice->>Server: emit('spin:request')
    Server->>Mutex: Check activeRoomSpins.has(roomId)
    Mutex-->>Server: false (Room is unlocked)
    
    Server->>Mutex: Set activeRoomSpins.set(roomId, spinState)
    Note over Server: Server calculates random prize & targetAngle
    Server->>Alice: Broadcast 'spin:start' { targetAngle, duration: 5000, sliceIndex }
    Server->>Bob: Broadcast 'spin:start' { targetAngle, duration: 5000, sliceIndex }

    Note over Alice, Bob: Both clients run identical 5000ms canvas easing animation

    Bob->>Server: emit('spin:request') [Simultaneous Attempt]
    Server->>Mutex: Check activeRoomSpins.has(roomId)
    Mutex-->>Server: true (Locked!)
    Server-->>Bob: emit('spin:error', { message: 'Wheel is already spinning!' })

    Note over Server: 5000ms timer completes on server
    Server->>DB: INSERT INTO spin_history (room_id, user_id, reward)
    Server->>Mutex: activeRoomSpins.delete(roomId) [Unlock]
    Server->>Alice: Broadcast 'spin:complete' { reward, winner }
    Server->>Bob: Broadcast 'spin:complete' { reward, winner }
    Server->>Alice: Broadcast 'spin:history_update'
    Server->>Bob: Broadcast 'spin:history_update'
```

### Target Angle Calculation
To ensure that all connected screens visually land on the exact slice chosen by the server:
- The total wheel angle is 360 degrees divided by total slices (8 slices = 45 degrees per slice).
- The server selects winning slice index `i` (0 to 7) based on weighted probability.
- Target angle formula:
  $$\text{Target Angle} = (5 \times 360) + (360 - (\text{index} \times 45 + 22.5))$$
- 5 full revolutions (1800 degrees) provide dramatic spin acceleration and deceleration, while the offset centers the pointer directly on the winning slice.

---

## 4. Real-Time Communication Architecture

Socket.IO partitions connections into virtual channels called **Rooms**, keyed by `room_code` (e.g. `7AU9SU`).

### Channel Isolation
- When a socket emits a chat message (`chat:message`), the server persists it to PostgreSQL and broadcasts exclusively to `io.to(currentRoomCode).emit('chat:received', ...)`.
- Players in room `ROOM_A` never receive messages, player join alerts, or spin animations intended for room `ROOM_B`.

### Resilience and Reconnection
- The client socket instance is configured with automatic reconnection backoff:
  ```javascript
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  ```
- If a temporary network interruption occurs, the client automatically attempts reconnection. Upon reconnecting, the server updates `socket_id` and restores online status in `room_players`.
