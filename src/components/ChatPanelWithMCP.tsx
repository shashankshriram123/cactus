import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Zap, Database, Cloud } from 'lucide-react';
import './ChatPanel.css';
import './ChatPanelMCP.css';
import { bedrockService, BEDROCK_MODELS, type ChatMessage, type BedrockModelKey } from '../services/bedrock';
import { mcpClient, type BedrockResponse } from '../services/mcp-client';

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
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [mcpServerStatus, setMCPServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

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
        await mcpClient.healthCheck();
        setMCPServerStatus('online');
      } catch (error) {
        setMCPServerStatus('offline');
        console.log('MCP Server not available, using direct Bedrock calls');
      }
    };

    checkMCPServer();
  }, []);

  /* Auto-save chat session when using MCP server */
  useEffect(() => {
    if (useMCPServer && mcpServerStatus === 'online' && messages.length > 0) {
      const saveSession = async () => {
        try {
          await mcpClient.saveChatSession({
            sessionId,
            title,
            color,
            messages,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (error) {
          console.error('Failed to save chat session:', error);
        }
      };

      const debounceTimer = setTimeout(saveSession, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [messages, title, color, useMCPServer, mcpServerStatus, sessionId]);

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
        const mcpResponse = await mcpClient.sendMessage(
          newMessages,
          autoSelectModel ? undefined : model,
          autoSelectModel
        );
        response = mcpResponse.response;
        selectedModel = mcpResponse.selectedModel;
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
        <div className="backend-controls">
          <button
            className={`backend-toggle ${useMCPServer ? 'mcp' : 'direct'}`}
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
            <span className="backend-label">
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
        <div className="mcp-status-banner offline">
          💾 MCP Server offline - chats won't be saved to database
        </div>
      )}
      {useMCPServer && mcpServerStatus === 'online' && (
        <div className="mcp-status-banner online">
          💾 Chat auto-saving to database (Session: {sessionId.split('_')[1]})
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
                  <span className="backend-indicator">📊</span>
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
