// MCP Client Service for React App
// This replaces direct Bedrock calls with MCP server API calls

import type { ChatMessage, BedrockModelKey } from './bedrock';

export interface BedrockResponse {
  response: string;
  selectedModel: BedrockModelKey;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

const API_BASE = process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001/api';

export interface ChatSession {
  sessionId: string;
  title: string;
  color: number;
  messages: ChatMessage[];
  projectId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GraphProject {
  projectId: string;
  name: string;
  nodes: any[];
  branches: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

class MCPClientService {
  private async request(endpoint: string, options: RequestInit = {}) {
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

  async getAllChatSessions(limit: number = 50): Promise<ChatSession[]> {
    return this.request(`/chat-sessions?limit=${limit}`);
  }

  async deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request(`/chat-sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async searchChatSessions(query: string, limit: number = 20): Promise<ChatSession[]> {
    return this.request(`/chat-sessions/search/${encodeURIComponent(query)}?limit=${limit}`);
  }

  // Graph Project Methods
  async saveGraphProject(project: GraphProject): Promise<{ success: boolean; id: string }> {
    return this.request('/graph-projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async getGraphProject(projectId: string): Promise<GraphProject> {
    return this.request(`/graph-projects/${projectId}`);
  }

  async getAllGraphProjects(limit: number = 50): Promise<GraphProject[]> {
    return this.request(`/graph-projects?limit=${limit}`);
  }

  async deleteGraphProject(projectId: string): Promise<{ success: boolean }> {
    return this.request(`/graph-projects/${projectId}`, {
      method: 'DELETE',
    });
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

  async getAvailableModels(): Promise<Record<BedrockModelKey, any>> {
    return this.request('/bedrock/models');
  }

  // Analytics Methods
  async getChatAnalytics(): Promise<{
    totalSessions: number;
    totalMessages: number;
    modelUsage: Array<{ _id: string; count: number }>;
  }> {
    return this.request('/analytics/chats');
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }
}

export const mcpClient = new MCPClientService();
