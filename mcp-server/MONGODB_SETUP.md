# Quick MongoDB Setup for Cactus MCP Server

## Option 1: Local MongoDB (Recommended for Development)
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community

# Test connection
mongosh
> show dbs
> use cactus_app
> db.chatSessions.find()  # Will be empty initially
```

## Option 2: Docker MongoDB
```bash
# Start MongoDB container
docker run -d --name cactus-mongo -p 27017:27017 mongo:latest

# Connect to container
docker exec -it cactus-mongo mongosh
```

## Option 3: MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/atlas
2. Sign up for free account
3. Create free cluster (512MB)
4. Get connection string from "Connect" button
5. Add your IP to allowlist
6. Create database user

## Environment Configuration

Create/update your `.env` file in the mcp-server directory:

### For Local/Docker:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=cactus_app
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### For MongoDB Atlas:
```env
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster0.xyz.mongodb.net/
MONGODB_DATABASE=cactus_app
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

## Test Your Setup

```bash
cd mcp-server

# Install dependencies (if not done)
npm install

# Build the project
npm run build

# Start in development mode
npm run dev

# Should see:
# ✅ Connected to MongoDB successfully
# 🚀 Cactus MCP Server running
```

## Troubleshooting

### MongoDB Connection Issues:
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Restart MongoDB
brew services restart mongodb/brew/mongodb-community

# Check MongoDB logs
tail -f /usr/local/var/log/mongodb/mongo.log
```

### Check Database Contents:
```bash
mongosh
> use cactus_app
> show collections
> db.chatSessions.find().pretty()
> db.graphProjects.find().pretty()
```

### Reset Database (if needed):
```bash
mongosh
> use cactus_app
> db.dropDatabase()  # Careful! This deletes all data
```
