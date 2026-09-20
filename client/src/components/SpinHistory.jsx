import React from 'react';
import './SpinHistory.css';

export default function SpinHistory({ history }) {
  const formatTime = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="history-wrapper">
      <div className="history-header">
        <strong>Spin History</strong>
        <span className="history-count">{history.length} records</span>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="history-empty">No spins yet.</div>
        ) : (
          history.map((spin, idx) => (
            <div key={spin.id || idx} className="history-row">
              <div>
                <span className="history-user">{spin.username}</span> won{' '}
                <span className="history-prize">{spin.reward}</span>
              </div>
              <span className="history-time">{formatTime(spin.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
