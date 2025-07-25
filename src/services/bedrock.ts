import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Configuration
const MAX_RESPONSE_LENGTH = 200; // Character limit for responses
const MAX_TOKENS = 100; // Token limit to approximately achieve the character limit

// Available Bedrock models
export const BEDROCK_MODELS = {
  'claude-3-5-sonnet': {
    id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    name: 'Claude 3.5 Sonnet',
    description: 'Best for complex reasoning, analysis, and coding',
    strengths: ['reasoning', 'analysis', 'coding', 'writing']
  },
  'claude-3-haiku': {
    id: 'anthropic.claude-3-haiku-20240307-v1:0',
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient for simple tasks',
    strengths: ['speed', 'simple-tasks', 'summarization']
  },
  'claude-3-sonnet': {
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    name: 'Claude 3 Sonnet',
    description: 'Balanced performance and speed',
    strengths: ['general', 'conversation', 'balanced']
  },
  'titan-text-express': {
    id: 'amazon.titan-text-express-v1',
    name: 'Titan Text Express',
    description: 'Amazon\'s fast text model',
    strengths: ['enterprise', 'speed', 'reliability']
  }
};

export type BedrockModelKey = keyof typeof BEDROCK_MODELS;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

// Model selection based on query analysis
export function selectOptimalModel(query: string): BedrockModelKey {
  const lowerQuery = query.toLowerCase();
  
  // Code-related keywords
  const codeKeywords = ['code', 'function', 'debug', 'programming', 'javascript', 'typescript', 'python', 'css', 'html', 'api', 'algorithm'];
  
  // Analysis/reasoning keywords
  const reasoningKeywords = ['analyze', 'explain', 'compare', 'evaluate', 'strategy', 'plan', 'complex', 'detailed'];
  
  // Simple/quick keywords
  const simpleKeywords = ['what is', 'define', 'quick', 'summary', 'list', 'simple'];
  
  // Check query length and complexity
  const isLongQuery = query.length > 200;
  const hasCodeKeywords = codeKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasReasoningKeywords = reasoningKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasSimpleKeywords = simpleKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Model selection logic
  if (hasCodeKeywords || (hasReasoningKeywords && isLongQuery)) {
    return 'claude-3-5-sonnet'; // Best for coding and complex reasoning
  } else if (hasSimpleKeywords && !isLongQuery) {
    return 'claude-3-haiku'; // Fast for simple queries
  } else if (lowerQuery.includes('enterprise') || lowerQuery.includes('business')) {
    return 'titan-text-express'; // Enterprise use cases
  } else {
    return 'claude-3-sonnet'; // Good general-purpose default
  }
}

class BedrockService {
  private client: BedrockRuntimeClient;
  
  constructor() {
    // Initialize Bedrock client - you'll need to configure AWS credentials
    this.client = new BedrockRuntimeClient({
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      // Add your AWS credentials configuration here
      credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
      }
    });
  }

  async sendMessage(
    messages: ChatMessage[], 
    modelKey?: BedrockModelKey,
    autoSelect: boolean = true
  ): Promise<{ response: string; selectedModel: BedrockModelKey }> {
    
    const lastMessage = messages[messages.length - 1];
    const selectedModel = modelKey || (autoSelect ? selectOptimalModel(lastMessage.content) : 'claude-3-5-sonnet');
    const model = BEDROCK_MODELS[selectedModel];
    
    try {
      let response: string;
      
      // Different models have different request formats
      if (selectedModel.startsWith('claude')) {
        response = await this.invokeClaude(messages, model.id);
      } else if (selectedModel.startsWith('titan')) {
        response = await this.invokeTitan(messages, model.id);
      } else {
        throw new Error(`Unsupported model: ${selectedModel}`);
      }
      
      return { response, selectedModel };
      
    } catch (error) {
      console.error('Bedrock API error:', error);
      throw new Error(`Failed to get response from ${model.name}: ${error}`);
    }
  }

  private async invokeClaude(messages: ChatMessage[], modelId: string): Promise<string> {
    const prompt = this.formatMessagesForClaude(messages);
    
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: MAX_TOKENS, // Reduced to limit output to ~200 characters
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const fullResponse = responseBody.content[0].text;
    // Truncate to 200 characters if longer and add indicator
    if (fullResponse.length > MAX_RESPONSE_LENGTH) {
      return fullResponse.substring(0, MAX_RESPONSE_LENGTH) + '... [truncated]';
    }
    return fullResponse;
  }

  private async invokeTitan(messages: ChatMessage[], modelId: string): Promise<string> {
    const prompt = this.formatMessagesForTitan(messages);
    
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: MAX_TOKENS, // Reduced to limit output to ~200 characters
          temperature: 0.7,
          topP: 0.9,
          stopSequences: []
        }
      })
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const fullResponse = responseBody.results[0].outputText;
    // Truncate to 200 characters if longer and add indicator
    if (fullResponse.length > MAX_RESPONSE_LENGTH) {
      return fullResponse.substring(0, MAX_RESPONSE_LENGTH) + '... [truncated]';
    }
    return fullResponse;
  }

  private formatMessagesForClaude(messages: ChatMessage[]): string {
    return messages.map(msg => 
      `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
    ).join('\n\n');
  }

  private formatMessagesForTitan(messages: ChatMessage[]): string {
    return messages.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Bot'}: ${msg.content}`
    ).join('\n\n') + '\n\nBot:';
  }
}

export const bedrockService = new BedrockService();
