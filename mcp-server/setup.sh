#!/bin/bash

echo "🌵 Setting up Cactus MCP Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the mcp-server directory."
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    print_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+"
    exit 1
fi

print_success "Node.js $NODE_VERSION detected"

# Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Setup environment file
print_status "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_warning "Created .env file from template. Please update it with your actual credentials:"
    echo "  - MongoDB URI (default: mongodb://localhost:27017)"
    echo "  - AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
    echo "  - AWS region (default: us-east-1)"
    echo ""
    print_warning "Edit .env file: nano .env"
else
    print_success ".env file already exists"
fi

# Check MongoDB connection (optional)
print_status "Checking MongoDB connection..."
MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2)
if [ -z "$MONGODB_URI" ]; then
    MONGODB_URI="mongodb://localhost:27017"
fi

# Simple MongoDB connection test using Node.js
if command -v mongosh >/dev/null 2>&1; then
    if mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
        print_success "MongoDB connection successful"
    else
        print_warning "MongoDB connection failed. Make sure MongoDB is running:"
        echo "  - Local: brew services start mongodb/brew/mongodb-community"
        echo "  - Docker: docker run -d -p 27017:27017 mongo"
    fi
else
    print_warning "mongosh not found. Cannot test MongoDB connection."
fi

# Check AWS credentials (optional)
print_status "Checking AWS configuration..."
if command -v aws >/dev/null 2>&1; then
    if aws sts get-caller-identity >/dev/null 2>&1; then
        print_success "AWS credentials configured"
    else
        print_warning "AWS credentials not configured or invalid"
        echo "  - Configure: aws configure"
        echo "  - Or set in .env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
    fi
else
    print_warning "AWS CLI not found. Make sure to set AWS credentials in .env file"
fi

# Build the project
print_status "Building TypeScript project..."
if npm run build; then
    print_success "Project built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Create start script
print_status "Creating start script..."
cat > start-mcp-server.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Cactus MCP Server..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Start the server
npm start
EOF

chmod +x start-mcp-server.sh
print_success "Created start-mcp-server.sh"

# Create development script
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🛠️  Starting Cactus MCP Server in development mode..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Start in development mode with hot reload
npm run dev
EOF

chmod +x start-dev.sh
print_success "Created start-dev.sh"

# Final instructions
echo ""
print_success "🎉 Cactus MCP Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials:"
echo "   ${YELLOW}nano .env${NC}"
echo ""
echo "2. Start the server:"
echo "   ${YELLOW}./start-mcp-server.sh${NC}    # Production mode"
echo "   ${YELLOW}./start-dev.sh${NC}           # Development mode with hot reload"
echo ""
echo "3. The server will be available at:"
echo "   📡 REST API: http://localhost:3001"
echo "   📊 Health check: http://localhost:3001/health"
echo "   💬 Chat sessions: http://localhost:3001/api/chat-sessions"
echo ""
echo "4. Update your React app to use the new backend endpoints"
echo "   See README.md for integration examples"
echo ""

if [ ! -f ".env" ] || grep -q "your_access_key_here" .env; then
    print_warning "⚠️  Don't forget to update .env with your actual AWS credentials!"
fi
