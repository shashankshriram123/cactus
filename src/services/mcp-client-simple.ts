// Simple MCP Client Service for React App
import type { ChatMessage, BedrockModelKey } from './bedrock';

const API_BASE = process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001/api';

export interface BedrockResponse {
  response: string;
  selectedModel: BedrockModelKey;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ChatSession {
  sessionId: string;
  title: string;
  color: number;
  messages: ChatMessage[];
  projectId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class MCPClientService {
  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('MCP Client request failed:', error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Chat Session Methods
  async saveChatSession(session: ChatSession): Promise<{ success: boolean; id: string }> {
    return this.request('/chat-sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    return this.request(`/chat-sessions/${sessionId}`);
  }

  // Bedrock AI Methods
  async sendMessage(
    messages: ChatMessage[],
    preferredModel?: BedrockModelKey,
    autoSelect: boolean = true
  ): Promise<BedrockResponse> {
    return this.request('/bedrock/message', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        preferredModel,
        autoSelect,
      }),
    });
  }
}

export const mcpClient = new MCPClientService();
