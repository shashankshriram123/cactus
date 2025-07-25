import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Zap, Database, Cloud } from 'lucide-react';
import './ChatPanel.css';
import { bedrockService, BEDROCK_MODELS, type ChatMessage, type BedrockModelKey } from '../services/bedrock';

const COLORS = ['#f87171', '#facc15', '#34d399', '#60a5fa', '#c084fc'];

const ChatPanel: React.FC = () => {
  const [title, setTitle] = useState('New Chat');
  const [editing, setEdit] = useState(false);
  const [color, setColor] = useState(3);
  const [model, setModel] = useState<BedrockModelKey>('claude-3-5-sonnet');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSelectModel, setAutoSelectModel] = useState(true);
  const [lastSelectedModel, setLastSelectedModel] = useState<BedrockModelKey | null>(null);
  const [useMCPServer, setUseMCPServer] = useState(false);
  const [mcpServerStatus, setMCPServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  /* auto-grow textarea */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [draft]);

  /* auto-scroll to bottom */
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  /* Check MCP server status */
  useEffect(() => {
    const checkMCPServer = async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
          setMCPServerStatus('online');
        } else {
          setMCPServerStatus('offline');
        }
      } catch (error) {
        setMCPServerStatus('offline');
        console.log('MCP Server not available, using direct Bedrock calls');
      }
    };

    checkMCPServer();
  }, []);

  const cycleColor = () => setColor(i => (i + 1) % COLORS.length);
  
  const send = async () => {
    if (!draft.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: draft.trim(),
      timestamp: new Date()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setDraft('');
    setIsLoading(true);
    
    try {
      let response: string;
      let selectedModel: BedrockModelKey;

      if (useMCPServer && mcpServerStatus === 'online') {
        // Use MCP Server
        const mcpResponse = await fetch('http://localhost:3001/api/bedrock/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages,
            preferredModel: autoSelectModel ? undefined : model,
            autoSelect: autoSelectModel,
            sessionId: sessionId
          })
        });
        
        if (!mcpResponse.ok) throw new Error('MCP server error');
        
        const mcpData = await mcpResponse.json();
        response = mcpData.response;
        selectedModel = mcpData.selectedModel;
      } else {
        // Use direct Bedrock calls
        const bedrockResponse = await bedrockService.sendMessage(
          newMessages,
          autoSelectModel ? undefined : model,
          autoSelectModel
        );
        response = bedrockResponse.response;
        selectedModel = bedrockResponse.selectedModel;
      }
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        model: selectedModel
      };
      
      setMessages([...newMessages, assistantMessage]);
      setLastSelectedModel(selectedModel);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
        model: 'error'
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMCPServer = () => {
    if (mcpServerStatus === 'online') {
      setUseMCPServer(!useMCPServer);
    }
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
        
        {/* Backend Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '0 8px' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: useMCPServer ? '#ecfdf5' : '#eff6ff',
              color: useMCPServer ? '#065f46' : '#1e40af',
              fontSize: '12px',
              cursor: mcpServerStatus === 'online' ? 'pointer' : 'not-allowed',
              opacity: mcpServerStatus === 'online' ? 1 : 0.5
            }}
            onClick={toggleMCPServer}
            disabled={mcpServerStatus !== 'online'}
            title={
              mcpServerStatus === 'online' 
                ? (useMCPServer ? 'Using MCP Server (with database)' : 'Using Direct Bedrock')
                : 'MCP Server offline'
            }
          >
            {mcpServerStatus === 'checking' ? (
              <Loader2 size={16} className="spinner" />
            ) : useMCPServer ? (
              <Database size={16} />
            ) : (
              <Cloud size={16} />
            )}
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {mcpServerStatus === 'checking' ? 'Checking...' : 
               useMCPServer ? 'MCP' : 'Direct'}
            </span>
          </button>
        </div>

        <select
          className="model-select"
          value={model}
          onChange={e => setModel(e.target.value as BedrockModelKey)}
        >
          {Object.entries(BEDROCK_MODELS).map(([key, modelInfo]) => (
            <option key={key} value={key}>
              {modelInfo.name}
            </option>
          ))}
        </select>
        
        <button
          className={`auto-select-btn ${autoSelectModel ? 'active' : ''}`}
          onClick={() => setAutoSelectModel(!autoSelectModel)}
          title="Auto-select optimal model based on query"
        >
          <Zap size={16} />
        </button>
      </header>

      {/* MCP Server Status Banner */}
      {mcpServerStatus === 'offline' && (
        <div style={{
          padding: '6px 12px',
          margin: '0 12px 8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500',
          textAlign: 'center',
          background: '#fef3cd',
          color: '#92400e',
          border: '1px solid #fde047'
        }}>
          💾 MCP Server offline - chats won't be saved to database
        </div>
      )}
      {useMCPServer && mcpServerStatus === 'online' && (
        <div style={{
          padding: '6px 12px',
          margin: '0 12px 8px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500',
          textAlign: 'center',
          background: '#d1fae5',
          color: '#065f46',
          border: '1px solid #10b981'
        }}>
          💾 Auto-saving to database (Session: {sessionId.split('_')[1]})
        </div>
      )}

      {/* messages list */}
      <main className="chat-history" ref={chatHistoryRef}>
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
            {message.model && message.role === 'assistant' && (
              <div className="message-meta">
                <span className="model-badge">
                  {BEDROCK_MODELS[message.model as BedrockModelKey]?.name || message.model}
                </span>
                <span className="timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {useMCPServer && (
                  <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.7 }}>📊</span>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">
              <Loader2 className="spinner" size={16} />
              {lastSelectedModel && (
                <span className="loading-text">
                  {BEDROCK_MODELS[lastSelectedModel]?.name} is thinking...
                  {useMCPServer && ' (via MCP)'}
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* composer */}
      <footer className="chat-composer">
        <textarea
          ref={taRef}
          rows={1}
          className="chat-input"
          placeholder={`Type a message… (responses limited to 200 chars)${useMCPServer ? ' • Auto-saving' : ''}`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e =>
            e.key === 'Enter' && !e.shiftKey ? (e.preventDefault(), send()) : null
          }
        />
        <button
          className="send-btn"
          disabled={!draft.trim() || isLoading}
          onClick={send}
          title="Send (Enter)"
        >
          {isLoading ? <Loader2 className="spinner" size={20} /> : <Send strokeWidth={2} />}
        </button>
      </footer>
    </div>
  );
};

export default ChatPanel;
