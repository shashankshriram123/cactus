import { MongoClient, Db, Collection } from 'mongodb';
import { ChatSession, GraphProject } from './types.js';

export class MongoDBService {
  private client: MongoClient;
  private db: Db | null = null;
  private chatSessions: Collection<ChatSession> | null = null;
  private graphProjects: Collection<GraphProject> | null = null;

  constructor(connectionString: string, databaseName: string) {
    this.client = new MongoClient(connectionString);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(process.env.MONGODB_DATABASE || 'cactus_app');
      this.chatSessions = this.db.collection<ChatSession>('chatSessions');
      this.graphProjects = this.db.collection<GraphProject>('graphProjects');
      
      // Create indexes for better performance
      await this.chatSessions.createIndex({ sessionId: 1 });
      await this.chatSessions.createIndex({ createdAt: -1 });
      await this.graphProjects.createIndex({ projectId: 1 });
      
      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // Chat Session Methods
  async saveChatSession(session: ChatSession): Promise<string> {
    if (!this.chatSessions) throw new Error('MongoDB not connected');
    
    const result = await this.chatSessions.replaceOne(
      { sessionId: session.sessionId },
      { ...session, updatedAt: new Date() },
      { upsert: true }
    );
    
    return result.upsertedId?.toString() || session.sessionId;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    if (!this.chatSessions) throw new Error('MongoDB not connected');
    
    return await this.chatSessions.findOne({ sessionId });
  }

  async getAllChatSessions(limit: number = 50): Promise<ChatSession[]> {
    if (!this.chatSessions) throw new Error('MongoDB not connected');
    
    return await this.chatSessions
      .find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async deleteChatSession(sessionId: string): Promise<boolean> {
    if (!this.chatSessions) throw new Error('MongoDB not connected');
    
    const result = await this.chatSessions.deleteOne({ sessionId });
    return result.deletedCount > 0;
  }

  async searchChatSessions(query: string, limit: number = 20): Promise<ChatSession[]> {
    if (!this.chatSessions) throw new Error('MongoDB not connected');
    
    return await this.chatSessions
      .find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { 'messages.content': { $regex: query, $options: 'i' } }
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Graph Project Methods
  async saveGraphProject(project: GraphProject): Promise<string> {
    if (!this.graphProjects) throw new Error('MongoDB not connected');
    
    const result = await this.graphProjects.replaceOne(
      { projectId: project.projectId },
      { ...project, updatedAt: new Date() },
      { upsert: true }
    );
    
    return result.upsertedId?.toString() || project.projectId;
  }

  async getGraphProject(projectId: string): Promise<GraphProject | null> {
    if (!this.graphProjects) throw new Error('MongoDB not connected');
    
    return await this.graphProjects.findOne({ projectId });
  }

  async getAllGraphProjects(limit: number = 50): Promise<GraphProject[]> {
    if (!this.graphProjects) throw new Error('MongoDB not connected');
    
    return await this.graphProjects
      .find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async deleteGraphProject(projectId: string): Promise<boolean> {
    if (!this.graphProjects) throw new Error('MongoDB not connected');
    
    const result = await this.graphProjects.deleteOne({ projectId });
    return result.deletedCount > 0;
  }

  // Analytics Methods
  async getChatAnalytics() {
    if (!this.chatSessions) throw new Error('MongoDB not connected');
    
    const totalSessions = await this.chatSessions.countDocuments();
    const totalMessages = await this.chatSessions.aggregate([
      { $project: { messageCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } }
    ]).toArray();
    
    const modelUsage = await this.chatSessions.aggregate([
      { $unwind: '$messages' },
      { $match: { 'messages.model': { $exists: true } } },
      { $group: { _id: '$messages.model', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    return {
      totalSessions,
      totalMessages: totalMessages[0]?.total || 0,
      modelUsage
    };
  }
}
