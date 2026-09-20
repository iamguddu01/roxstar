import React, { useState } from 'react';
import './RoomHeader.css';

export default function RoomHeader({ room, onLeaveRoom }) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!room?.room_code) return;
    navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="room-header simple-card">
      <div className="header-left">
        <h2 className="header-title">{room?.name || 'Spin Room'}</h2>
        <div className="code-pill">
          <span>Code: <strong>{room?.room_code}</strong></span>
          <button type="button" className="copy-btn" onClick={copyRoomCode}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="header-right">
        <span className="badge badge-online">Connected</span>
        <button type="button" className="btn btn-danger" onClick={onLeaveRoom}>
          Leave Room
        </button>
      </div>
    </header>
  );
}
