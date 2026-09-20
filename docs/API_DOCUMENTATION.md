# REST API Documentation

Base URL: `http://localhost:5000` (Local) or your deployed production domain.

---

## 1. System Health

### 1.1 Fast Health Check (Zero-DB)
Used by container orchestrators, load balancers, and Render for instant liveness probes.

- **Method**: `GET`
- **URL**: `/health`
- **Headers**: None
- **Request Body**: None
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "status": "OK"
  }
  ```

### 1.2 Detailed Health Check (Database Ping)
Validates that the database connection pool is operational.

- **Method**: `GET`
- **URL**: `/api/health`
- **Headers**: None
- **Request Body**: None
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "status": "healthy",
    "serverTime": "2026-09-20T06:13:17.123Z",
    "databaseTime": "2026-09-20T06:13:17.121Z"
  }
  ```
- **Failure Status**: `500 Internal Server Error`

---

## 2. Rooms Endpoints (`/api/rooms`)

### 2.1 Create Room
Creates a new game arena and automatically generates a unique 6-character room code.

- **Method**: `POST`
- **URL**: `/api/rooms`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "username": "LuckyAce",
    "name": "Grand Championship"
  }
  ```
- **Validation Rules**:
  - `username`: Required, trimmed, between 2 and 30 characters.
  - `name`: Optional; defaults to `"{username}'s Arena"`.
- **Success Status**: `201 Created`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Room created successfully",
    "room": {
      "id": 1,
      "room_code": "7AU9SU",
      "name": "Grand Championship",
      "created_by": 1,
      "is_active": true,
      "created_at": "2026-09-20T06:00:00.000Z",
      "creator_username": "LuckyAce"
    },
    "user": {
      "id": 1,
      "username": "LuckyAce",
      "created_at": "2026-09-20T06:00:00.000Z"
    }
  }
  ```
- **Error Statuses**:
  - `400 Bad Request`: Missing username or invalid length.
  - `500 Internal Server Error`: Database insertion failure.

---

### 2.2 Join Room
Validates room existence and registers the player in `room_players`.

- **Method**: `POST`
- **URL**: `/api/rooms/join`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "username": "Bob",
    "roomCode": "7AU9SU"
  }
  ```
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Joined room successfully",
    "room": {
      "id": 1,
      "room_code": "7AU9SU",
      "name": "Grand Championship",
      "created_by": 1,
      "is_active": true,
      "created_at": "2026-09-20T06:00:00.000Z",
      "creator_username": "LuckyAce"
    },
    "user": {
      "id": 2,
      "username": "Bob",
      "created_at": "2026-09-20T06:05:00.000Z"
    }
  }
  ```
- **Error Statuses**:
  - `400 Bad Request`: Missing roomCode or username, or room is inactive.
  - `404 Not Found`: Room code does not match any active arena.

---

### 2.3 List Active Rooms
Retrieves recent public rooms along with their current online player count for the lobby browser.

- **Method**: `GET`
- **URL**: `/api/rooms`
- **Headers**: None
- **Request Body**: None
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "rooms": [
      {
        "id": 1,
        "room_code": "7AU9SU",
        "name": "Grand Championship",
        "created_at": "2026-09-20T06:00:00.000Z",
        "active_players_count": "3",
        "creator_name": "LuckyAce"
      }
    ]
  }
  ```

---

### 2.4 Get Room Details
Fetches metadata, host identity, and total/online player counts for a specific room.

- **Method**: `GET`
- **URL**: `/api/rooms/:code`
- **Headers**: None
- **Parameters**: `code` (string, e.g. `7AU9SU`)
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "room": {
      "id": 1,
      "room_code": "7AU9SU",
      "name": "Grand Championship",
      "created_by": 1,
      "is_active": true,
      "created_at": "2026-09-20T06:00:00.000Z",
      "creator_username": "LuckyAce"
    },
    "onlineCount": 2,
    "totalPlayers": 3
  }
  ```
- **Error Status**: `404 Not Found` if room does not exist.

---

### 2.5 Get Players in Room
Lists all players associated with a room, sorted by online status.

- **Method**: `GET`
- **URL**: `/api/rooms/:code/players`
- **Parameters**: `code` (string)
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "players": [
      {
        "id": 1,
        "room_id": 1,
        "user_id": 1,
        "socket_id": "dNgMz8cmrkRQNiLWAAAB",
        "is_online": true,
        "joined_at": "2026-09-20T06:00:00.000Z",
        "last_seen_at": "2026-09-20T06:10:00.000Z",
        "username": "LuckyAce"
      },
      {
        "id": 2,
        "room_id": 1,
        "user_id": 2,
        "socket_id": null,
        "is_online": false,
        "joined_at": "2026-09-20T06:05:00.000Z",
        "last_seen_at": "2026-09-20T06:08:00.000Z",
        "username": "Bob"
      }
    ]
  }
  ```

---

### 2.6 Get Spin History
Fetches chronological logs of completed spins in the room.

- **Method**: `GET`
- **URL**: `/api/rooms/:code/spins`
- **Query Parameters**: `limit` (optional integer, default `50`)
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "spins": [
      {
        "id": 4,
        "room_id": 1,
        "user_id": 1,
        "reward": "Free Spin Extra",
        "created_at": "2026-09-20T06:12:00.000Z",
        "username": "LuckyAce"
      }
    ]
  }
  ```

---

### 2.7 Get Chat Messages
Retrieves the recent conversation history in a room.

- **Method**: `GET`
- **URL**: `/api/rooms/:code/messages`
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "messages": [
      {
        "id": 1,
        "room_id": 1,
        "user_id": 1,
        "message": "Welcome everyone!",
        "created_at": "2026-09-20T06:01:00.000Z",
        "username": "LuckyAce"
      }
    ]
  }
  ```

---

### 2.8 Get Rewards Configuration
Returns the wheel segments metadata (labels, slice colors, icons, weights).

- **Method**: `GET`
- **URL**: `/api/rooms/rewards/config`
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "rewards": [
      { "id": 1, "label": "100 Gold Coins", "color": "#f59e0b", "textColor": "#1e1b4b", "icon": "coin", "weight": 20 },
      { "id": 2, "label": "Mystery Gift", "color": "#8b5cf6", "textColor": "#ffffff", "icon": "gift", "weight": 15 },
      { "id": 3, "label": "Free Spin Extra", "color": "#06b6d4", "textColor": "#ffffff", "icon": "spin", "weight": 15 },
      { "id": 4, "label": "250 Gold Coins", "color": "#10b981", "textColor": "#ffffff", "icon": "bag", "weight": 12 },
      { "id": 5, "label": "VIP Crown", "color": "#ec4899", "textColor": "#ffffff", "icon": "crown", "weight": 10 },
      { "id": 6, "label": "Jackpot 1000!", "color": "#ef4444", "textColor": "#ffffff", "icon": "fire", "weight": 5 },
      { "id": 7, "label": "50 Gold Coins", "color": "#3b82f6", "textColor": "#ffffff", "icon": "coin", "weight": 20 },
      { "id": 8, "label": "Double Score 2X", "color": "#f97316", "textColor": "#ffffff", "icon": "star", "weight": 13 }
    ]
  }
  ```

---

## 3. Users Endpoints (`/api/users`)

### 3.1 Login or Register
Finds an existing user by username or creates a new user profile.

- **Method**: `POST`
- **URL**: `/api/users/login`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "username": "LuckyAce"
  }
  ```
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "username": "LuckyAce",
      "created_at": "2026-09-20T06:00:00.000Z"
    }
  }
  ```

### 3.2 Get User by ID
- **Method**: `GET`
- **URL**: `/api/users/:id`
- **Success Status**: `200 OK`
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "username": "LuckyAce",
      "created_at": "2026-09-20T06:00:00.000Z"
    }
  }
  ```
- **Error Status**: `404 Not Found` if user does not exist.
