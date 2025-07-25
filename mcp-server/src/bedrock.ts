import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ChatMessage, BedrockModelKey, BedrockModelInfo, BedrockResponse } from './types.js';

export const BEDROCK_MODELS: Record<BedrockModelKey, BedrockModelInfo> = {
  'claude-3-5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    provider: 'anthropic',
    contextLength: 200000,
    strengths: ['complex reasoning', 'coding', 'analysis', 'creative writing']
  },
  'claude-3-5-haiku': {
    name: 'Claude 3.5 Haiku',
    id: 'anthropic.claude-3-5-haiku-20241022-v1:0',
    provider: 'anthropic',
    contextLength: 200000,
    strengths: ['speed', 'simple tasks', 'quick responses']
  },
  'claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    provider: 'anthropic',
    contextLength: 200000,
    strengths: ['balanced performance', 'general tasks']
  },
  'titan-text-express': {
    name: 'Titan Text Express',
    id: 'amazon.titan-text-express-v1',
    provider: 'amazon',
    contextLength: 8000,
    strengths: ['cost-effective', 'basic text generation']
  }
};

export class BedrockService {
  private client: BedrockRuntimeClient;
  private readonly maxResponseLength = 200;

  constructor(region: string = 'us-east-1') {
    this.client = new BedrockRuntimeClient({ 
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  selectOptimalModel(messages: ChatMessage[]): BedrockModelKey {
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

  private async invokeClaude(messages: ChatMessage[], modelId: string): Promise<string> {
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

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content?.[0]?.text || 'No response generated';
  }

  private async invokeTitan(messages: ChatMessage[], modelId: string): Promise<string> {
    const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n') + '\n\nassistant:';

    const body = JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: 1000,
        temperature: 0.7,
        topP: 0.9
      }
    });

    const command = new InvokeModelCommand({
      modelId,
      body,
      contentType: 'application/json',
      accept: 'application/json'
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.results?.[0]?.outputText || 'No response generated';
  }

  private truncateResponse(text: string): string {
    if (text.length <= this.maxResponseLength) return text;
    return text.substring(0, this.maxResponseLength - 3) + '...';
  }

  async sendMessage(
    messages: ChatMessage[], 
    preferredModel?: BedrockModelKey, 
    autoSelect: boolean = true
  ): Promise<BedrockResponse> {
    const selectedModel = autoSelect && !preferredModel 
      ? this.selectOptimalModel(messages) 
      : preferredModel || 'claude-3-5-sonnet';

    const modelInfo = BEDROCK_MODELS[selectedModel];
    
    try {
      let response: string;
      
      if (modelInfo.provider === 'anthropic') {
        response = await this.invokeClaude(messages, modelInfo.id);
      } else if (modelInfo.provider === 'amazon') {
        response = await this.invokeTitan(messages, modelInfo.id);
      } else {
        throw new Error(`Unsupported model provider: ${modelInfo.provider}`);
      }

      const truncatedResponse = this.truncateResponse(response);

      return {
        response: truncatedResponse,
        selectedModel,
        usage: {
          inputTokens: 0, // Would need to implement token counting
          outputTokens: 0
        }
      };
    } catch (error) {
      console.error(`Error invoking ${selectedModel}:`, error);
      throw new Error(`Failed to get response from ${modelInfo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAvailableModels(): Promise<Record<BedrockModelKey, BedrockModelInfo>> {
    return BEDROCK_MODELS;
  }
}
