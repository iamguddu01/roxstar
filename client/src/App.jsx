import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import { soundManager } from './utils/audio';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD
    ? 'https://roxstar-production.up.railway.app'
    : 'http://localhost:5001');

export default function App() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('roxstar_username') || localStorage.getItem('spinarena_username') || '';
  });
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [spinHistory, setSpinHistory] = useState([]);

  // Spin wheel real-time states
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentSpinner, setCurrentSpinner] = useState(null);
  const [spinEvent, setSpinEvent] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  // Keep username saved in localStorage
  useEffect(() => {
    if (username) {
      localStorage.setItem('roxstar_username', username);
    }
  }, [username]);

  // Connect Socket.IO on mount
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to server with ID:', socket.id);
    });

    socket.on('room:joined', (data) => {
      console.log('[Socket] Room joined successfully:', data);
      setRoom(data.room);
      setUser(data.user);
      setIsSpinning(!!data.isSpinning);
      if (data.currentSpin) {
        setCurrentSpinner({
          id: data.currentSpin.spinnerId,
          username: data.currentSpin.spinnerUsername,
        });
      }
    });

    socket.on('room:player_joined', (data) => {
      soundManager.playJoin();
      setMessages((prev) => [
        ...prev,
        {
          id: `join-${Date.now()}-${Math.random()}`,
          isSystem: true,
          message: data.message,
          created_at: data.timestamp,
        },
      ]);
    });

    socket.on('room:player_left', (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `leave-${Date.now()}-${Math.random()}`,
          isSystem: true,
          message: data.message,
          created_at: data.timestamp,
        },
      ]);
    });

    socket.on('room:players_update', (data) => {
      setPlayers(data.players || []);
    });

    socket.on('chat:received', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('spin:start', (data) => {
      console.log('[Socket] Spin started:', data);
      setIsSpinning(true);
      setCurrentSpinner({
        id: data.spinnerId,
        username: data.spinnerUsername,
      });
      setSpinEvent(data);
    });

    socket.on('spin:complete', (data) => {
      console.log('[Socket] Spin completed:', data);
      setIsSpinning(false);
      setCurrentSpinner(null);
    });

    socket.on('spin:history_update', (data) => {
      setSpinHistory(data.spins || []);
    });

    socket.on('spin:error', (err) => {
      alert(err.message || 'Spin error');
    });

    socket.on('room:error', (err) => {
      setError(err.message || 'Room error');
      setLoading(false);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch initial room data (chat history, spin history, players)
  const loadRoomInitialData = async (roomCode) => {
    try {
      const [msgRes, spinRes, playersRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/rooms/${roomCode}/messages`),
        fetch(`${SERVER_URL}/api/rooms/${roomCode}/spins`),
        fetch(`${SERVER_URL}/api/rooms/${roomCode}/players`),
      ]);

      const [msgData, spinData, playersData] = await Promise.all([
        msgRes.json(),
        spinRes.json(),
        playersRes.json(),
      ]);

      if (msgData.success) setMessages(msgData.messages || []);
      if (spinData.success) setSpinHistory(spinData.spins || []);
      if (playersData.success) setPlayers(playersData.players || []);
    } catch (err) {
      console.error('Error fetching room initial data:', err);
    }
  };

  // 1. Create Room Flow
  const handleCreateRoom = async (name) => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create room');
      }

      setRoom(data.room);
      setUser(data.user);

      // Join socket room
      socketRef.current?.emit('room:join', {
        roomCode: data.room.room_code,
        userId: data.user.id,
        username: data.user.username,
      });

      await loadRoomInitialData(data.room.room_code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Join Room Flow
  const handleJoinRoom = async (code) => {
    if (!username.trim() || !code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          roomCode: code.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to join room');
      }

      setRoom(data.room);
      setUser(data.user);

      // Join socket room
      socketRef.current?.emit('room:join', {
        roomCode: data.room.room_code,
        userId: data.user.id,
        username: data.user.username,
      });

      await loadRoomInitialData(data.room.room_code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Send Real-time Chat
  const handleSendMessage = (messageText) => {
    if (!socketRef.current || !messageText.trim()) return;
    socketRef.current.emit('chat:message', { message: messageText.trim() });
  };

  // 4. Request Shared Spin
  const handleSpinRequest = () => {
    if (!socketRef.current || isSpinning) return;
    socketRef.current.emit('spin:request');
  };

  // 5. Leave Room
  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('room:leave');
    }
    setRoom(null);
    setPlayers([]);
    setMessages([]);
    setSpinHistory([]);
    setIsSpinning(false);
    setCurrentSpinner(null);
    setSpinEvent(null);
    setError(null);
  };

  return (
    <div className="app-container">
      {!room ? (
        <Lobby
          username={username}
          setUsername={setUsername}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          loading={loading}
          error={error}
          serverUrl={SERVER_URL}
        />
      ) : (
        <GameRoom
          room={room}
          user={user}
          players={players}
          messages={messages}
          spinHistory={spinHistory}
          isSpinning={isSpinning}
          currentSpinner={currentSpinner}
          spinEvent={spinEvent}
          onSpinRequest={handleSpinRequest}
          onSendMessage={handleSendMessage}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}
