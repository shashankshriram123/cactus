import express from 'express';
import cors from 'cors';
import { MongoDBService } from './mongodb.js';
import { BedrockService } from './bedrock.js';
import { ChatSession, GraphProject } from './types.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Services
const mongoService = new MongoDBService(
  process.env.MONGODB_URI || 'mongodb://localhost:27017',
  process.env.MONGODB_DATABASE || 'cactus_app'
);

const bedrockService = new BedrockService(process.env.AWS_REGION);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat Session Routes
app.post('/api/chat-sessions', async (req, res) => {
  try {
    const session: ChatSession = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const id = await mongoService.saveChatSession(session);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/chat-sessions/:sessionId', async (req, res) => {
  try {
    const session = await mongoService.getChatSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/chat-sessions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const sessions = await mongoService.getAllChatSessions(limit);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.delete('/api/chat-sessions/:sessionId', async (req, res) => {
  try {
    const deleted = await mongoService.deleteChatSession(req.params.sessionId);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/chat-sessions/search/:query', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const sessions = await mongoService.searchChatSessions(req.params.query, limit);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Graph Project Routes
app.post('/api/graph-projects', async (req, res) => {
  try {
    const project: GraphProject = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const id = await mongoService.saveGraphProject(project);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/graph-projects/:projectId', async (req, res) => {
  try {
    const project = await mongoService.getGraphProject(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/graph-projects', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const projects = await mongoService.getAllGraphProjects(limit);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.delete('/api/graph-projects/:projectId', async (req, res) => {
  try {
    const deleted = await mongoService.deleteGraphProject(req.params.projectId);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Bedrock Routes
app.post('/api/bedrock/message', async (req, res) => {
  try {
    const { messages, preferredModel, autoSelect = true } = req.body;
    const response = await bedrockService.sendMessage(messages, preferredModel, autoSelect);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/bedrock/models', async (req, res) => {
  try {
    const models = await bedrockService.getAvailableModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Analytics Routes
app.get('/api/analytics/chats', async (req, res) => {
  try {
    const analytics = await mongoService.getChatAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Start server
async function startServer() {
  try {
    await mongoService.connect();
    app.listen(PORT, () => {
      console.log(`🚀 REST API Server running on http://localhost:${PORT}`);
      console.log(`📊 Analytics: http://localhost:${PORT}/api/analytics/chats`);
      console.log(`💬 Chat Sessions: http://localhost:${PORT}/api/chat-sessions`);
      console.log(`🔧 Graph Projects: http://localhost:${PORT}/api/graph-projects`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await mongoService.disconnect();
  process.exit(0);
});

startServer();
