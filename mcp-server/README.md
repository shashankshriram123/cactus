# Cactus MCP Server

A Model Context Protocol (MCP) server that provides centralized backend services for the Cactus application, handling both MongoDB persistence and AWS Bedrock AI operations.

## Features

### 🗄️ MongoDB Integration
- **Chat Session Management**: Save, retrieve, search, and delete chat conversations
- **Graph Project Storage**: Persist conversation tree/graph structures
- **Analytics**: Track usage patterns, model performance, and user behavior
- **Indexing**: Optimized queries with proper MongoDB indexing

### 🤖 AWS Bedrock Integration
- **Multi-Model Support**: Claude 3.5 Sonnet/Haiku, Claude 3 Sonnet, Titan Text Express
- **Auto-Selection**: Intelligent model selection based on query complexity
- **Response Limiting**: 200-character response truncation
- **Error Handling**: Robust error management and retry logic

### 🔌 Dual Interface
- **MCP Protocol**: Native MCP server for tool-based interactions
- **REST API**: HTTP endpoints for direct web application integration

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or remote)
- AWS credentials with Bedrock access

### Installation

1. **Navigate to MCP server directory:**
   ```bash
   cd mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

4. **Build and start:**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Production mode
   npm run build && npm start
   ```

### Environment Configuration

Create a `.env` file with:

```env
# Server Configuration
PORT=3001

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=cactus_app

# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Optional
DEBUG=false
```

## API Documentation

### Chat Sessions

```bash
# Save/Update Chat Session
POST /api/chat-sessions
{
  "sessionId": "unique-id",
  "title": "Chat Title",
  "color": 3,
  "messages": [...],
  "projectId": "optional-project-id"
}

# Get Chat Session
GET /api/chat-sessions/:sessionId

# List All Chat Sessions
GET /api/chat-sessions?limit=50

# Search Chat Sessions
GET /api/chat-sessions/search/:query?limit=20

# Delete Chat Session
DELETE /api/chat-sessions/:sessionId
```

### Graph Projects

```bash
# Save/Update Graph Project
POST /api/graph-projects
{
  "projectId": "unique-id",
  "name": "Project Name",
  "nodes": [...],
  "branches": [...]
}

# Get Graph Project
GET /api/graph-projects/:projectId

# List All Graph Projects
GET /api/graph-projects?limit=50

# Delete Graph Project
DELETE /api/graph-projects/:projectId
```

### Bedrock AI

```bash
# Send Message to AI
POST /api/bedrock/message
{
  "messages": [
    {"role": "user", "content": "Hello", "timestamp": "2024-01-01T00:00:00Z"}
  ],
  "preferredModel": "claude-3-5-sonnet",  // optional
  "autoSelect": true                       // optional, default true
}

# Get Available Models
GET /api/bedrock/models
```

### Analytics

```bash
# Get Chat Analytics
GET /api/analytics/chats
# Returns: total sessions, total messages, model usage stats
```

## MCP Tools

When running as an MCP server, the following tools are available:

### Chat Operations
- `save_chat_session` - Save or update a chat session
- `get_chat_session` - Retrieve a chat session by ID
- `get_all_chat_sessions` - List all chat sessions
- `delete_chat_session` - Delete a chat session
- `search_chat_sessions` - Search chat sessions by content

### Graph Operations
- `save_graph_project` - Save or update a graph project
- `get_graph_project` - Retrieve a graph project by ID
- `get_all_graph_projects` - List all graph projects
- `delete_graph_project` - Delete a graph project

### AI Operations
- `send_bedrock_message` - Send message to Bedrock AI
- `get_bedrock_models` - Get available AI models

### Analytics
- `get_chat_analytics` - Get usage analytics

## Integration with React App

Update your React app to use the MCP server:

```typescript
// Replace direct bedrock calls with MCP server calls
const API_BASE = 'http://localhost:3001/api';

// Example: Save chat session
async function saveChatSession(session: ChatSession) {
  const response = await fetch(`${API_BASE}/chat-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  });
  return response.json();
}

// Example: Send AI message
async function sendMessage(messages: ChatMessage[]) {
  const response = await fetch(`${API_BASE}/bedrock/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, autoSelect: true })
  });
  return response.json();
}
```

## Architecture Benefits

### 🎯 Centralized Backend
- Single source of truth for data operations
- Consistent error handling and logging
- Unified authentication and authorization

### 📈 Scalability
- Easy to add new AI providers (OpenAI, Gemini, etc.)
- Database abstraction for easy migration
- Horizontal scaling with load balancers

### 🔒 Security
- Centralized credential management
- Input validation and sanitization
- Rate limiting and request throttling

### 🛠️ Development
- Clear separation of concerns
- Easy testing and mocking
- Shared types and interfaces

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check if MongoDB is running
   brew services start mongodb/brew/mongodb-community
   # Or with Docker
   docker run -d -p 27017:27017 mongo
   ```

2. **AWS Bedrock Access Denied**
   ```bash
   # Verify AWS credentials
   aws sts get-caller-identity
   # Check Bedrock model access
   aws bedrock list-foundation-models --region us-east-1
   ```

3. **Port Already in Use**
   ```bash
   # Change PORT in .env file or kill existing process
   lsof -ti:3001 | xargs kill -9
   ```

### Debug Mode

Enable detailed logging:
```bash
DEBUG=true npm run dev
```

## Next Steps

1. **Add Authentication**: Implement JWT-based auth for API endpoints
2. **Rate Limiting**: Add request throttling and usage quotas
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Monitoring**: Add health checks, metrics, and alerting
5. **Documentation**: Auto-generate API docs with Swagger/OpenAPI

---

🚀 **Ready to centralize your backend!** Start the MCP server and update your React app to use the new endpoints.
