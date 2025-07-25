import React from 'react';
import './ChatPanel.css';

const ChatPanel: React.FC = () => (
  <div className="chat-panel">
    {/* ⬇︎ temporary placeholder */}
    <div className="chat-placeholder">
      <p className="title">Chat</p>
      <p>Ask questions about the selected node…</p>
    </div>
  </div>
);

export default ChatPanel;
