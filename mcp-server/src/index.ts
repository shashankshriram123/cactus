import dotenv from 'dotenv';
import { CactusMCPServer } from './server.js';

// Load environment variables
dotenv.config();

async function main() {
  const server = new CactusMCPServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down MCP Server...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start MCP Server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
