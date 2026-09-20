import React from 'react';
import './PlayerList.css';

export default function PlayerList({ players, currentUserId, creatorId }) {
  const onlinePlayers = players.filter((p) => p.is_online);
  const offlinePlayers = players.filter((p) => !p.is_online);

  return (
    <div className="playerlist-wrapper">
      <div className="playerlist-header">
        <strong>Players</strong>
        <span className="playerlist-count">
          {onlinePlayers.length} online / {players.length} total
        </span>
      </div>

      <div className="playerlist-body">
        {onlinePlayers.map((player) => {
          const isMe = player.user_id === currentUserId;
          const isHost = player.user_id === creatorId;

          return (
            <div key={player.id} className="player-row">
              <span className="online-indicator"></span>
              <span className="player-name">{player.username}</span>
              <div className="player-badges">
                {isMe && <span className="badge badge-you">You</span>}
                {isHost && <span className="badge badge-host">Host</span>}
              </div>
            </div>
          );
        })}

        {offlinePlayers.length > 0 && (
          <div className="offline-section">
            <span className="offline-title">Offline</span>
            {offlinePlayers.map((player) => (
              <div key={player.id} className="player-row offline">
                <span className="offline-indicator"></span>
                <span className="player-name">{player.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
