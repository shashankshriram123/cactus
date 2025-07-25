import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { MongoDBService } from './mongodb.js';
import { BedrockService } from './bedrock.js';
import { ChatSession, GraphProject, ChatMessage } from './types.js';

export class CactusMCPServer {
  private server: Server;
  private mongoService: MongoDBService;
  private bedrockService: BedrockService;

  constructor() {
    this.server = new Server(
      {
        name: 'cactus-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.mongoService = new MongoDBService(
      process.env.MONGODB_URI || 'mongodb://localhost:27017',
      process.env.MONGODB_DATABASE || 'cactus_app'
    );

    this.bedrockService = new BedrockService(process.env.AWS_REGION);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // MongoDB Chat Operations
          case 'save_chat_session':
            return await this.saveChatSession(args);
          case 'get_chat_session':
            return await this.getChatSession(args);
          case 'get_all_chat_sessions':
            return await this.getAllChatSessions(args);
          case 'delete_chat_session':
            return await this.deleteChatSession(args);
          case 'search_chat_sessions':
            return await this.searchChatSessions(args);

          // MongoDB Graph Operations
          case 'save_graph_project':
            return await this.saveGraphProject(args);
          case 'get_graph_project':
            return await this.getGraphProject(args);
          case 'get_all_graph_projects':
            return await this.getAllGraphProjects(args);
          case 'delete_graph_project':
            return await this.deleteGraphProject(args);

          // Bedrock Operations
          case 'send_bedrock_message':
            return await this.sendBedrockMessage(args);
          case 'get_bedrock_models':
            return await this.getBedrockModels();

          // Analytics
          case 'get_chat_analytics':
            return await this.getChatAnalytics();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      // Chat Session Tools
      {
        name: 'save_chat_session',
        description: 'Save or update a chat session in MongoDB',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            title: { type: 'string' },
            color: { type: 'number' },
            messages: { type: 'array' },
            projectId: { type: 'string', description: 'Optional project ID' },
          },
          required: ['sessionId', 'title', 'color', 'messages'],
        },
      },
      {
        name: 'get_chat_session',
        description: 'Retrieve a chat session by ID',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'get_all_chat_sessions',
        description: 'Get all chat sessions (with optional limit)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
          },
        },
      },
      {
        name: 'delete_chat_session',
        description: 'Delete a chat session by ID',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'search_chat_sessions',
        description: 'Search chat sessions by title or message content',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 20 },
          },
          required: ['query'],
        },
      },

      // Graph Project Tools
      {
        name: 'save_graph_project',
        description: 'Save or update a graph project in MongoDB',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            name: { type: 'string' },
            nodes: { type: 'array' },
            branches: { type: 'array' },
          },
          required: ['projectId', 'name', 'nodes', 'branches'],
        },
      },
      {
        name: 'get_graph_project',
        description: 'Retrieve a graph project by ID',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'get_all_graph_projects',
        description: 'Get all graph projects (with optional limit)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
          },
        },
      },
      {
        name: 'delete_graph_project',
        description: 'Delete a graph project by ID',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string' },
          },
          required: ['projectId'],
        },
      },

      // Bedrock Tools
      {
        name: 'send_bedrock_message',
        description: 'Send a message to AWS Bedrock and get AI response',
        inputSchema: {
          type: 'object',
          properties: {
            messages: { type: 'array' },
            preferredModel: { type: 'string' },
            autoSelect: { type: 'boolean', default: true },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_bedrock_models',
        description: 'Get list of available Bedrock models',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Analytics Tools
      {
        name: 'get_chat_analytics',
        description: 'Get analytics about chat usage',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  // MongoDB Chat Operations
  private async saveChatSession(args: any) {
    const session: ChatSession = {
      sessionId: args.sessionId,
      title: args.title,
      color: args.color,
      messages: args.messages,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: args.projectId,
    };

    const id = await this.mongoService.saveChatSession(session);
    return {
      content: [
        {
          type: 'text',
          text: `Chat session saved with ID: ${id}`,
        },
      ],
    };
  }

  private async getChatSession(args: any) {
    const session = await this.mongoService.getChatSession(args.sessionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(session, null, 2),
        },
      ],
    };
  }

  private async getAllChatSessions(args: any) {
    const sessions = await this.mongoService.getAllChatSessions(args.limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(sessions, null, 2),
        },
      ],
    };
  }

  private async deleteChatSession(args: any) {
    const deleted = await this.mongoService.deleteChatSession(args.sessionId);
    return {
      content: [
        {
          type: 'text',
          text: deleted ? `Session ${args.sessionId} deleted` : `Session ${args.sessionId} not found`,
        },
      ],
    };
  }

  private async searchChatSessions(args: any) {
    const sessions = await this.mongoService.searchChatSessions(args.query, args.limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(sessions, null, 2),
        },
      ],
    };
  }

  // MongoDB Graph Operations
  private async saveGraphProject(args: any) {
    const project: GraphProject = {
      projectId: args.projectId,
      name: args.name,
      nodes: args.nodes,
      branches: args.branches,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await this.mongoService.saveGraphProject(project);
    return {
      content: [
        {
          type: 'text',
          text: `Graph project saved with ID: ${id}`,
        },
      ],
    };
  }

  private async getGraphProject(args: any) {
    const project = await this.mongoService.getGraphProject(args.projectId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(project, null, 2),
        },
      ],
    };
  }

  private async getAllGraphProjects(args: any) {
    const projects = await this.mongoService.getAllGraphProjects(args.limit);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  }

  private async deleteGraphProject(args: any) {
    const deleted = await this.mongoService.deleteGraphProject(args.projectId);
    return {
      content: [
        {
          type: 'text',
          text: deleted ? `Project ${args.projectId} deleted` : `Project ${args.projectId} not found`,
        },
      ],
    };
  }

  // Bedrock Operations
  private async sendBedrockMessage(args: any) {
    const response = await this.bedrockService.sendMessage(
      args.messages,
      args.preferredModel,
      args.autoSelect
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async getBedrockModels() {
    const models = await this.bedrockService.getAvailableModels();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(models, null, 2),
        },
      ],
    };
  }

  // Analytics
  private async getChatAnalytics() {
    const analytics = await this.mongoService.getChatAnalytics();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analytics, null, 2),
        },
      ],
    };
  }

  async start() {
    // Connect to MongoDB
    await this.mongoService.connect();

    // Start the MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 Cactus MCP Server running');
  }

  async stop() {
    await this.mongoService.disconnect();
  }
}
