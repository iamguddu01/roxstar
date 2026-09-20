import React, { useState, useEffect } from 'react';
import './Lobby.css';

export default function Lobby({
  username,
  setUsername,
  onCreateRoom,
  onJoinRoom,
  loading,
  error,
  serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5001',
}) {
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeRooms, setActiveRooms] = useState([]);
  const [activeTab, setActiveTab] = useState('join');
  const [fetchingRooms, setFetchingRooms] = useState(false);

  const fetchPublicRooms = async () => {
    setFetchingRooms(true);
    try {
      const res = await fetch(`${serverUrl}/api/rooms`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        setActiveRooms(data.rooms);
      }
    } catch (err) {
      console.warn('Could not fetch active rooms:', err);
    } finally {
      setFetchingRooms(false);
    }
  };

  useEffect(() => {
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    onCreateRoom(roomName.trim() || `${username.trim()}'s Room`);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase());
  };

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <h1>Multiplayer Spin Wheel</h1>
        <p>Create or join a room to spin together in real-time.</p>
      </header>

      {error && <div className="lobby-error">{error}</div>}

      <div className="lobby-card simple-card">
        {/* Username section */}
        <div className="form-group">
          <label className="form-label" htmlFor="username-input">
            Your Name:
          </label>
          <input
            id="username-input"
            type="text"
            className="input-field"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={25}
            required
          />
        </div>

        {/* Tab switcher */}
        <div className="tab-buttons">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join Room
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Room
          </button>
        </div>

        {activeTab === 'join' ? (
          <form onSubmit={handleJoinSubmit} className="lobby-form">
            <div className="form-group">
              <label className="form-label" htmlFor="code-input">
                Room Code:
              </label>
              <input
                id="code-input"
                type="text"
                className="input-field code-input"
                placeholder="e.g. TGMDLS"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={10}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !username.trim() || !joinCode.trim()}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateSubmit} className="lobby-form">
            <div className="form-group">
              <label className="form-label" htmlFor="room-name-input">
                Room Name (optional):
              </label>
              <input
                id="room-name-input"
                type="text"
                className="input-field"
                placeholder="My Spin Room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={40}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !username.trim()}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        )}

        {/* Active rooms list */}
        {activeRooms.length > 0 && (
          <div className="active-rooms-wrapper">
            <div className="active-rooms-title">
              <span>Active Rooms</span>
              <button
                type="button"
                className="refresh-btn"
                onClick={fetchPublicRooms}
                disabled={fetchingRooms}
              >
                {fetchingRooms ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="active-rooms-list">
              {activeRooms.map((r) => (
                <div key={r.id} className="active-room-item">
                  <div>
                    <div className="active-room-name">{r.name}</div>
                    <div className="active-room-meta">
                      Code: <strong>{r.room_code}</strong> · {r.active_players_count || 1} online
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (!username.trim()) {
                        alert('Please enter your name first.');
                        return;
                      }
                      onJoinRoom(r.room_code);
                    }}
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
