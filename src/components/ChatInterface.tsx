import React from 'react';
import './ChatInterface.css';

export const ChatInterface: React.FC = () => {
  return (
    <div className="chat-interface">
      <div className="chat-messages">
        <div className="message user">
          <p>Hello, what can you do?</p>
        </div>
        <div className="message assistant">
          <p>I can help you visualize and manage your conversational branches. Try creating a sub-branch from the graph!</p>
        </div>
         <div className="message user">
          <p>How do I create a new branch?</p>
        </div>
         <div className="message assistant">
          <p>Just click on any node in the graph and then use the "Create Sub-Branch" button in the controls below the graph.</p>
        </div>
      </div>
      <div className="chat-input-area">
        <input type="text" placeholder="Type your message here..." />
        <button>Send</button>
      </div>
    </div>
  );
};
