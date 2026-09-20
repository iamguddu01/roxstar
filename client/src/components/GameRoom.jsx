import React, { useState } from 'react';
import RoomHeader from './RoomHeader';
import SpinWheel from './SpinWheel';
import ChatBox from './ChatBox';
import SpinHistory from './SpinHistory';
import PlayerList from './PlayerList';
import './GameRoom.css';

export default function GameRoom({
  room,
  user,
  players,
  messages,
  spinHistory,
  isSpinning,
  currentSpinner,
  spinEvent,
  onSpinRequest,
  onSendMessage,
  onLeaveRoom,
}) {
  const [sidebarTab, setSidebarTab] = useState('chat');

  return (
    <div className="game-room-container">
      <RoomHeader room={room} onLeaveRoom={onLeaveRoom} />

      <div className="game-room-content">
        {/* Left Side: Wheel */}
        <section className="wheel-section simple-card">
          <div className="wheel-section-header">
            <h3>Wheel Arena</h3>
            <span className={`badge ${isSpinning ? 'badge-host' : 'badge-online'}`}>
              {isSpinning ? 'Spinning' : 'Ready'}
            </span>
          </div>

          <SpinWheel
            isSpinning={isSpinning}
            currentSpinner={currentSpinner}
            onSpinRequest={onSpinRequest}
            spinEvent={spinEvent}
            canSpin={!isSpinning}
          />
        </section>

        {/* Right Side: Sidebar Tabs */}
        <aside className="sidebar-section simple-card">
          <div className="sidebar-tab-buttons">
            <button
              type="button"
              className={`sidebar-btn ${sidebarTab === 'chat' ? 'active' : ''}`}
              onClick={() => setSidebarTab('chat')}
            >
              Chat ({messages.length})
            </button>
            <button
              type="button"
              className={`sidebar-btn ${sidebarTab === 'history' ? 'active' : ''}`}
              onClick={() => setSidebarTab('history')}
            >
              Spins ({spinHistory.length})
            </button>
            <button
              type="button"
              className={`sidebar-btn ${sidebarTab === 'players' ? 'active' : ''}`}
              onClick={() => setSidebarTab('players')}
            >
              Players ({players.filter((p) => p.is_online).length})
            </button>
          </div>

          <div className="sidebar-content">
            {sidebarTab === 'chat' && (
              <ChatBox
                messages={messages}
                onSendMessage={onSendMessage}
                currentUserId={user?.id}
              />
            )}
            {sidebarTab === 'history' && <SpinHistory history={spinHistory} />}
            {sidebarTab === 'players' && (
              <PlayerList
                players={players}
                currentUserId={user?.id}
                creatorId={room?.created_by}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
