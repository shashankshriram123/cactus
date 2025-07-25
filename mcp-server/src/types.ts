export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

export interface ChatSession {
  _id?: string;
  sessionId: string;
  title: string;
  color: number;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  projectId?: string;
}

export interface GraphProject {
  _id?: string;
  projectId: string;
  name: string;
  nodes: any[];
  branches: any[];
  createdAt: Date;
  updatedAt: Date;
}

export type BedrockModelKey = 'claude-3-5-sonnet' | 'claude-3-5-haiku' | 'claude-3-sonnet' | 'titan-text-express';

export interface BedrockModelInfo {
  name: string;
  id: string;
  provider: string;
  contextLength: number;
  strengths: string[];
}

export interface BedrockResponse {
  response: string;
  selectedModel: BedrockModelKey;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface MCPToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}
