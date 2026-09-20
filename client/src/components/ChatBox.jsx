import React, { useState, useRef, useEffect } from 'react';
import './ChatBox.css';

export default function ChatBox({ messages, onSendMessage, currentUserId }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const formatTime = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="chatbox-wrapper">
      <div className="chatbox-header">
        <strong>Chat</strong>
        <span className="chatbox-count">{messages.length} messages</span>
      </div>

      <div className="chatbox-body">
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg, idx) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id || idx} className="chat-system">
                  {msg.message}
                </div>
              );
            }

            const isOwn = msg.userId === currentUserId || msg.user_id === currentUserId;

            return (
              <div
                key={msg.id || idx}
                className={`chat-row ${isOwn ? 'chat-own' : 'chat-other'}`}
              >
                <div className="chat-message-bubble">
                  <div className="chat-meta">
                    <span className="chat-user">{msg.username}</span>
                    <span className="chat-timestamp">{formatTime(msg.created_at)}</span>
                  </div>
                  <div className="chat-content">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chatbox-footer" onSubmit={handleSubmit}>
        <input
          type="text"
          className="input-field chat-text-input"
          placeholder="Type message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={300}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!inputText.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
