import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';    
import './ChatPanel.css';

type ChatPanelProps = {
  onSend?: (text: string, model: string) => void;
};

const COLORS = ['#f87171', '#facc15', '#34d399', '#60a5fa', '#c084fc'];

const ChatPanel: React.FC<ChatPanelProps> = ({ onSend }) => {
  const [title, setTitle] = useState('New Chat');
  const [editing, setEdit] = useState(false);
  const [color, setColor] = useState(3);
  const [model, setModel] = useState('gpt-4o');
  const [draft, setDraft] = useState('');

  const taRef = useRef<HTMLTextAreaElement>(null);

  /* auto-grow textarea */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [draft]);

  const cycleColor = () => setColor(i => (i + 1) % COLORS.length);

  const send = () => {
    if (!draft.trim()) return;
    onSend?.(draft, model);   // notify parent (App.tsx)
    setDraft('');
  };

  return (
    <div className="chat-panel">
      {/* header */}
      <header className="chat-header">
        <div
          className="color-chip"
          style={{ background: COLORS[color] }}
          onClick={cycleColor}
        />
        {editing ? (
          <input
            className="title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setEdit(false)}
            autoFocus
          />
        ) : (
          <h2 className="chat-title" onDoubleClick={() => setEdit(true)}>
            {title}
          </h2>
        )}
        <select
          className="model-select"
          value={model}
          onChange={e => setModel(e.target.value)}
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="claude-3">Claude 3</option>
        </select>
      </header>

      {/* messages list (empty for now) */}
      <main className="chat-history" />

      {/* composer */}
      <footer className="chat-composer">
        <textarea
          ref={taRef}
          rows={1}
          className="chat-input"
          placeholder="Type a message…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e =>
            e.key === 'Enter' && !e.shiftKey ? (e.preventDefault(), send()) : null
          }
        />
        <button
          className="send-btn"
          disabled={!draft.trim()}
          onClick={send}
          title="Send (Enter)"
        >
          <Send strokeWidth={2} />
        </button>
      </footer>
    </div>
  );
};

export default ChatPanel;
