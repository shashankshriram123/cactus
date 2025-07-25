import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { MongoClient, Db, Collection } from 'mongodb';

// Load environment variables
dotenv.config();

// MongoDB setup
const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
let db: Db;
let chatCollection: Collection;

// Connect to MongoDB
async function connectMongoDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DATABASE || 'cactus_app');
    chatCollection = db.collection('chatSessions');
    console.log('✅ MongoDB connected for chat storage');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  }
}

// Initialize MongoDB connection
connectMongoDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Bedrock models configuration
const BEDROCK_MODELS = {
  'claude-3-5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    provider: 'anthropic'
  },
  'claude-3-5-haiku': {
    name: 'Claude 3.5 Haiku',
    id: 'anthropic.claude-3-5-haiku-20241022-v1:0',
    provider: 'anthropic'
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    provider: 'anthropic'
  }
};

// Helper function to select optimal model
function selectOptimalModel(messages: any[]) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const messageLength = lastMessage.length;
  const hasCode = /```|`|\bcode\b|\bfunction\b|\bclass\b|\bimport\b/.test(lastMessage.toLowerCase());
  const isComplex = messageLength > 100 || /\banalyze\b|\bcompare\b|\bexplain\b|\bdetailed\b/.test(lastMessage.toLowerCase());
  const isSimple = messageLength < 50 && !hasCode && !isComplex;

  if (isSimple) {
    return 'claude-3-5-haiku';
  } else if (hasCode || isComplex) {
    return 'claude-3-5-sonnet';
  } else {
    return 'claude-3-sonnet';
  }
}

// Helper function to invoke Claude models
async function invokeClaude(messages: any[], modelId: string): Promise<string> {
  const systemMessage = 'You are a helpful AI assistant. Provide concise, accurate responses.';
  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1000,
    system: systemMessage,
    messages: formattedMessages
  });

  const command = new InvokeModelCommand({
    modelId,
    body,
    contentType: 'application/json',
    accept: 'application/json'
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.content?.[0]?.text || 'No response generated';
}

// Helper function to truncate response to 200 characters
function truncateResponse(text: string): string {
  const maxLength = 200;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test Bedrock endpoint with real AI responses
app.post('/api/bedrock/message', async (req: any, res: any) => {
  try {
    console.log('Received message request:', req.body);
    
    const { messages, preferredModel, autoSelect = true, sessionId } = req.body;
    
    // Select model
    const selectedModel = autoSelect && !preferredModel 
      ? selectOptimalModel(messages) 
      : preferredModel || 'claude-3-5-sonnet';
    
    console.log(`Using model: ${selectedModel}`);
    
    const modelInfo = BEDROCK_MODELS[selectedModel as keyof typeof BEDROCK_MODELS];
    
    if (!modelInfo) {
      throw new Error(`Unsupported model: ${selectedModel}`);
    }
    
    // Get AI response
    const aiResponse = await invokeClaude(messages, modelInfo.id);
    
    // Truncate to 200 characters
    const truncatedResponse = truncateResponse(aiResponse);
    
    console.log(`AI Response (${truncatedResponse.length} chars):`, truncatedResponse);
    
    // Save to MongoDB if connected
    if (chatCollection && sessionId) {
      try {
        const chatSession = {
          sessionId: sessionId || `session_${Date.now()}`,
          messages: [
            ...messages,
            {
              role: 'assistant',
              content: truncatedResponse,
              timestamp: new Date().toISOString(),
              model: selectedModel
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await chatCollection.replaceOne(
          { sessionId: chatSession.sessionId },
          chatSession,
          { upsert: true }
        );
        
        console.log(`💾 Chat saved to MongoDB (Session: ${chatSession.sessionId})`);
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }
    
    res.json({
      response: truncatedResponse,
      selectedModel,
      usage: { inputTokens: 0, outputTokens: 0 } // Could implement token counting
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process message' 
    });
  }
});

// Get all saved chat sessions
app.get('/api/chat-sessions', async (req: any, res: any) => {
  try {
    if (!chatCollection) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const sessions = await chatCollection
      .find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
    
    console.log(`📋 Retrieved ${sessions.length} chat sessions from database`);
    res.json(sessions);
  } catch (error) {
    console.error('Error retrieving chat sessions:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to retrieve chat sessions' 
    });
  }
});

// Get specific chat session
app.get('/api/chat-sessions/:sessionId', async (req: any, res: any) => {
  try {
    if (!chatCollection) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const session = await chatCollection.findOne({ sessionId: req.params.sessionId });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log(`📋 Retrieved chat session: ${req.params.sessionId}`);
    res.json(session);
  } catch (error) {
    console.error('Error retrieving chat session:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to retrieve chat session' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 REST API Server running on http://localhost:${PORT}`);
  console.log(`💬 Test endpoint: http://localhost:${PORT}/api/bedrock/message`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
