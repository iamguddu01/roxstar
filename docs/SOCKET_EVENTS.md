# Socket.IO Real-Time Events Catalog

This document specifies the WebSocket bidirectional events utilized by Roxstar for multiplayer synchronization, real-time chat, and wheel game logic.

---

## 1. Event Overview Matrix

| Event Name | Direction | Trigger Condition | Purpose |
| :--- | :--- | :--- | :--- |
| `room:join` | Client to Server | User enters arena | Joins socket room channel, sets online presence |
| `room:joined` | Server to Client | After `room:join` processed | Confirms room entry and provides current spin state |
| `room:player_joined`| Server to Peers | Another player enters | Informs peers of newcomer for chat alert |
| `room:player_left` | Server to Peers | Player leaves/disconnects | Informs peers that a participant departed |
| `room:players_update`| Server to Room | Presence change occurs | Refreshes connected player list in UI |
| `room:error` | Server to Client | Room lookup failure | Informs client of joining error |
| `chat:message` | Client to Server | Player clicks send | Submits a chat message to the room |
| `chat:received` | Server to Room | Message or system notice | Distributes message to all room members |
| `spin:request` | Client to Server | Player clicks Spin button | Requests a new spin round |
| `spin:start` | Server to Room | Mutex acquired and reward picked | Synchronously starts wheel animation |
| `spin:complete` | Server to Room | 5000ms duration finishes | Reveals winner and logs reward |
| `spin:history_update`| Server to Room | Spin recorded to DB | Refreshes spin history feed |
| `spin:error` | Server to Client | Spin already active / invalid | Rejects simultaneous or invalid spin request |
| `room:leave` | Client to Server | Player clicks Leave button | Gracefully leaves room before disconnecting |

---

## 2. Client-to-Server Events (Emitters)

### 2.1 `room:join`
Emitted immediately when a player navigates into a room.

- **Payload**:
  ```json
  {
    "roomCode": "7AU9SU",
    "userId": 1,
    "username": "LuckyAce"
  }
  ```
- **Server Actions**:
  1. Validates room code against database.
  2. Associates `socket.id` with `user_id` in `room_players`.
  3. Joins the socket to Socket.IO room channel `socket.join(roomCode)`.
  4. Responds with `room:joined` to sender and broadcasts `room:player_joined` and `room:players_update` to peers.

---

### 2.2 `chat:message`
Emitted when a user submits text in the room chatbox.

- **Payload**:
  ```json
  {
    "message": "Let's win that jackpot!"
  }
  ```
- **Server Actions**:
  1. Trims text and verifies user is in an active room.
  2. Inserts message into `chat_messages` table.
  3. Broadcasts `chat:received` to all clients in `room_code`.

---

### 2.3 `spin:request`
Emitted when a player clicks the primary **Spin Wheel** button.

- **Payload**: None (`{}`)
- **Server Actions**:
  1. Checks room spin mutex: `activeRoomSpins.has(roomId)`.
  2. If locked, emits `spin:error` to requester.
  3. If unlocked, acquires lock, determines prize, calculates `targetAngle`, and broadcasts `spin:start` to the room.

---

### 2.4 `room:leave`
Emitted when a player voluntarily exits an arena to return to the Lobby.

- **Payload**: None (`{}`)
- **Server Actions**:
  1. Sets `is_online = false` in `room_players`.
  2. Broadcasts `room:player_left` to remaining peers.
  3. Removes socket from channel: `socket.leave(roomCode)`.
  4. Broadcasts refreshed `room:players_update`.

---

## 3. Server-to-Client Events (Listeners)

### 3.1 `room:joined`
Emitted to the connecting client confirming entry.

- **Payload**:
  ```json
  {
    "room": {
      "id": 1,
      "room_code": "7AU9SU",
      "name": "Grand Championship",
      "created_by": 1,
      "is_active": true
    },
    "user": {
      "id": 1,
      "username": "LuckyAce"
    },
    "isSpinning": false,
    "currentSpin": null
  }
  ```

---

### 3.2 `room:player_joined`
Broadcast to all peers in the room when a newcomer enters.

- **Payload**:
  ```json
  {
    "user": {
      "id": 2,
      "username": "Bob"
    },
    "message": "Bob has entered the arena.",
    "timestamp": "2026-09-20T06:05:00.000Z"
  }
  ```

---

### 3.3 `room:player_left`
Broadcast to room members when a player departs or loses connection.

- **Payload**:
  ```json
  {
    "userId": 2,
    "username": "Bob",
    "message": "Bob left the room.",
    "timestamp": "2026-09-20T06:10:00.000Z"
  }
  ```

---

### 3.4 `room:players_update`
Broadcast whenever participant presence changes.

- **Payload**:
  ```json
  {
    "players": [
      {
        "id": 1,
        "room_id": 1,
        "user_id": 1,
        "socket_id": "dNgMz8cmrkRQNiLWAAAB",
        "is_online": true,
        "username": "LuckyAce"
      }
    ],
    "onlineCount": 1
  }
  ```

---

### 3.5 `chat:received`
Broadcast when a player message or automated system announcement arrives.

- **Standard User Message**:
  ```json
  {
    "id": 15,
    "roomId": 1,
    "userId": 1,
    "username": "LuckyAce",
    "message": "Good luck all!",
    "created_at": "2026-09-20T06:11:00.000Z"
  }
  ```
- **System Announcement** (`isSystem: true`):
  ```json
  {
    "id": "sys-1726812600000",
    "isSystem": true,
    "message": "LuckyAce is spinning the prize wheel!",
    "created_at": "2026-09-20T06:11:30.000Z"
  }
  ```

---

### 3.6 `spin:start`
Broadcast to all players in the room instructing them to begin synchronized wheel rotation.

- **Payload**:
  ```json
  {
    "spinnerId": 1,
    "spinnerUsername": "LuckyAce",
    "rewardId": 3,
    "sliceIndex": 2,
    "targetAngle": 2047.5,
    "duration": 5000,
    "timestamp": "2026-09-20T06:12:00.000Z"
  }
  ```

---

### 3.7 `spin:complete`
Broadcast after the 5000ms animation concludes, revealing the result.

- **Payload**:
  ```json
  {
    "spinId": 12,
    "spinnerId": 1,
    "spinnerUsername": "LuckyAce",
    "reward": {
      "id": 3,
      "label": "Free Spin Extra",
      "color": "#06b6d4",
      "icon": "spin"
    },
    "created_at": "2026-09-20T06:12:05.000Z"
  }
  ```

---

### 3.8 `spin:error`
Emitted strictly to the requester if a spin action cannot be performed.

- **Payload**:
  ```json
  {
    "message": "Wheel is already spinning! Please wait for the current round to complete."
  }
  ```

---

## 4. Socket Disconnect Handling

When a user closes their browser or encounters network termination:
1. Socket.IO fires the 'disconnect' event on the server.
2. The server queries `room_players` where `socket_id = socket.id`.
3. Marks the player `is_online = false`.
4. Emits `room:player_left` and `room:players_update` to the room.
5. If the disconnecting user was currently spinning, the server timer continues running independently to persist the spin and release the room mutex safely, avoiding deadlock.
