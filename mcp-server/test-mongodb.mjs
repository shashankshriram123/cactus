#!/usr/bin/env node

// Quick MongoDB Atlas connection test
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri || uri.includes('<db_password>')) {
    console.log('❌ Please update MONGODB_URI in .env file with your actual password');
    console.log('Current URI:', uri);
    process.exit(1);
  }

  console.log('🔗 Testing MongoDB Atlas connection...');
  console.log('📍 Cluster:', uri.split('@')[1]?.split('/')[0]);

  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');

    // Test database operations
    const db = client.db(process.env.MONGODB_DATABASE || 'cactus_app');
    
    // Insert a test document
    const testCollection = db.collection('connectionTest');
    const testDoc = { 
      message: 'Hello from Cactus MCP Server!', 
      timestamp: new Date(),
      test: true 
    };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Successfully wrote test document');

    // Read it back
    const result = await testCollection.findOne({ test: true });
    console.log('✅ Successfully read test document:', result?.message);

    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('✅ Cleaned up test document');

    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Available collections:', collections.map(c => c.name));

  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('💡 Check your username/password in the connection string');
    } else if (error.message.includes('network')) {
      console.log('💡 Check your internet connection and MongoDB Atlas network access');
    }
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();
