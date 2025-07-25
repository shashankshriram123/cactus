#!/bin/bash

echo "🍃 MongoDB Local Installation Guide for macOS"
echo "=============================================="
echo ""

# Check if Homebrew is installed
if ! command -v brew >/dev/null 2>&1; then
    echo "❌ Homebrew not found. Install it first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    exit 1
fi

echo "✅ Homebrew detected"
echo ""

echo "📦 Installing MongoDB Community Edition..."
echo "brew tap mongodb/brew"
echo "brew install mongodb-community"
echo ""

echo "🚀 Starting MongoDB service..."
echo "brew services start mongodb/brew/mongodb-community"
echo ""

echo "🔧 Your MongoDB will be running at:"
echo "   📍 Connection String: mongodb://localhost:27017"
echo "   📂 Data Directory: /usr/local/var/mongodb"
echo "   📝 Log Directory: /usr/local/var/log/mongodb"
echo ""

echo "⚙️  Update your MCP server .env file:"
echo "   MONGODB_URI=mongodb://localhost:27017"
echo "   MONGODB_DATABASE=cactus_app"
echo ""

echo "🛠️  Useful commands:"
echo "   Start:  brew services start mongodb/brew/mongodb-community"
echo "   Stop:   brew services stop mongodb/brew/mongodb-community"
echo "   Status: brew services list | grep mongodb"
echo ""

echo "🧪 Test connection:"
echo "   mongosh"
echo "   > show dbs"
echo "   > use cactus_app"
echo "   > db.test.insertOne({hello: 'world'})"
echo ""
