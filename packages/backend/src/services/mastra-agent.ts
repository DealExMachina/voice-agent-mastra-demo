import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { Mem0Integration } from '@mastra/mem0';
import { createTool } from '@mastra/core/tools';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Message, Entity, EntityType } from '@voice-agent-mastra-demo/shared';

export class MastraAgentService {
  private agents: Map<string, Agent> = new Map();
  private mem0Integration: Mem0Integration | null = null;
  private memory: Memory | null = null;
  private isConfigured: boolean = false;

  constructor() {
    // Check if we have the required environment variables
    this.isConfigured = !!(
      (config.OPENAI_API_KEY || config.ANTHROPIC_API_KEY) &&
      config.MEM0_API_KEY &&
      config.MEM0_DATABASE_URL
    );
  }

  async initialize(): Promise<void> {
    if (!this.isConfigured) {
      logger.warn('Mastra agents not configured - missing API keys');
      return;
    }

    try {
      // Initialize Mem0 integration
      this.mem0Integration = new Mem0Integration({
        config: {
          apiKey: config.MEM0_API_KEY || '',
          user_id: 'voice-agent-system', // Default user ID
        },
      });

      // Create memory tools for agents
      const mem0RememberTool = createTool({
        id: 'mem0-remember',
        description: 'Remember and recall information from previous conversations',
        inputSchema: z.object({
          query: z.string().describe('Question or topic to search for in memory'),
        }),
        outputSchema: z.object({
          memories: z.array(z.string()).describe('Retrieved memories'),
        }),
        execute: async ({ context }) => {
          if (!this.mem0Integration) {
            return { memories: [] };
          }

          try {
            const memory = await this.mem0Integration.searchMemory(context.query);
            logger.info(`Retrieved memory for query: ${context.query}`);
            return { memories: [memory] };
          } catch (error) {
            logger.error('Error retrieving memory:', error);
            return { memories: [] };
          }
        },
      });

      const mem0MemorizeTool = createTool({
        id: 'mem0-memorize',
        description: 'Save important information to long-term memory',
        inputSchema: z.object({
          information: z.string().describe('Information to save to memory'),
        }),
        outputSchema: z.object({
          success: z.boolean().describe('Whether the memory was saved successfully'),
        }),
        execute: async ({ context }) => {
          if (!this.mem0Integration) {
            return { success: false };
          }

          try {
            await this.mem0Integration.createMemory(context.information);
            logger.info(`Stored memory: ${context.information}`);
            return { success: true };
          } catch (error) {
            logger.error('Error storing memory:', error);
            return { success: false };
          }
        },
      });

      // Create entity extraction agent
      const entityExtractionAgent = new Agent({
        name: 'entity-extraction-agent',
        instructions: `
          You are an expert entity extraction system. Your job is to identify and extract entities from text.
          
          Extract these types of entities:
          - PERSON: Names of people
          - ORGANIZATION: Companies, institutions, agencies
          - LOCATION: Cities, countries, addresses, landmarks
          - DATE: Dates and time expressions
          - EMAIL: Email addresses
          - PHONE: Phone numbers
          - URL: Web addresses
          - PRODUCT: Product names and services
          - MONEY: Monetary amounts
          - PERCENTAGE: Percentage values
          
          Respond with a JSON array of entities, each containing:
          - value: The entity text
          - type: The entity type
          - confidence: Confidence score (0.0-1.0)
          
          Be precise and only extract clear, well-defined entities.
        `,
        model: openai('gpt-4o-mini'),
        tools: { mem0RememberTool, mem0MemorizeTool },
      });

      // Create conversation agent
      const conversationAgent = new Agent({
        name: 'conversation-agent',
        instructions: `
          You are a helpful voice assistant that can have natural conversations.
          You have access to memory tools to remember and recall information from previous conversations.
          
          Guidelines:
          - Be conversational and natural
          - Use the memory tools to remember important information about users
          - Recall previous conversations when relevant
          - Extract and remember entities from conversations
          - Provide helpful and contextual responses
        `,
        model: openai('gpt-4o'),
        tools: { mem0RememberTool, mem0MemorizeTool },
      });

      // Store agents
      this.agents.set('entity-extraction', entityExtractionAgent);
      this.agents.set('conversation', conversationAgent);

      logger.info('Mastra agents initialized successfully');
    } catch (error) {
      logger.error('Error initializing Mastra agents:', error);
      this.isConfigured = false;
    }
  }

  async isReady(): Promise<boolean> {
    return this.isConfigured && this.agents.size > 0;
  }

  /**
   * Extract entities from a message using Mastra agent
   */
  async extractEntitiesFromMessage(message: Message): Promise<{
    entities: Entity[];
    summary: string;
    sentiment: string;
    topics: string[];
  }> {
    if (!this.isConfigured) {
      logger.warn('Mastra agents not configured, using fallback entity extraction');
      return this.fallbackEntityExtraction(message.content);
    }

    try {
      const entityAgent = this.agents.get('entity-extraction');
      if (!entityAgent) {
        throw new Error('Entity extraction agent not found');
      }

      // Use Mastra agent to extract entities
      const response = await entityAgent.generate(
        `Extract entities from this message: "${message.content}"`,
        {
          resourceId: message.type === 'user' ? (message as any).userId || 'anonymous' : 'agent',
          threadId: message.sessionId,
        }
      );

      // Parse the response and convert to our Entity format
      const entities = this.parseEntitiesFromResponse(response.text);
      
      // Generate summary and analyze sentiment
      const summary = `Extracted ${entities.length} entities from message`;
      const sentiment = this.analyzeSentiment(message.content);
      const topics = this.extractTopics(message.content);

      logger.info(`Mastra agent extracted ${entities.length} entities from message ${message.id}`);

      return {
        entities,
        summary,
        sentiment,
        topics,
      };
    } catch (error) {
      logger.error('Error in Mastra entity extraction:', error);
      return this.fallbackEntityExtraction(message.content);
    }
  }

  /**
   * Extract entities from conversation using Mastra agent
   */
  async extractEntitiesFromConversation(messages: Message[]): Promise<{
    entities: Entity[];
    summary: string;
    sentiment: string;
    topics: string[];
  }> {
    if (!this.isConfigured) {
      return this.fallbackEntityExtraction(messages.map(m => m.content).join('\n'));
    }

    try {
      const combinedText = messages.map(m => `${m.type}: ${m.content}`).join('\n');
      const mockMessage: Message = {
        id: 'conversation-extract',
        content: combinedText,
        timestamp: new Date(),
        sessionId: messages[0]?.sessionId || 'unknown',
        type: 'user',
        userId: (messages[0] as any)?.userId || 'unknown',
      };

      return await this.extractEntitiesFromMessage(mockMessage);
    } catch (error) {
      logger.error('Error extracting entities from conversation:', error);
      return this.fallbackEntityExtraction(messages.map(m => m.content).join('\n'));
    }
  }

  /**
   * Generate conversation summary using Mastra agent
   */
  async generateSummary(messages: Message[], entities: Entity[]): Promise<{
    text: string;
    keyPoints: string[];
    sentiment: string;
  }> {
    if (!this.isConfigured) {
      return this.fallbackSummary(messages, entities);
    }

    try {
      const conversationAgent = this.agents.get('conversation');
      if (!conversationAgent) {
        throw new Error('Conversation agent not found');
      }

      const conversationText = messages.map(m => `${m.type}: ${m.content}`).join('\n');
      const entityList = entities.map(e => `${e.type}: ${e.value}`).join(', ');

      const response = await conversationAgent.generate(
        `Summarize this conversation and provide key points:
        
        Conversation:
        ${conversationText}
        
        Entities found: ${entityList}
        
        Please provide:
        1. A comprehensive summary
        2. Key points (as bullet points)
        3. Overall sentiment
        `,
        {
          resourceId: (messages[0] as any)?.userId || 'anonymous',
          threadId: messages[0]?.sessionId || 'unknown',
        }
      );

      // Parse response into structured format
      const summary = this.parseSummaryResponse(response.text);
      
      return summary;
    } catch (error) {
      logger.error('Error generating Mastra summary:', error);
      return this.fallbackSummary(messages, entities);
    }
  }

  /**
   * Parse entities from agent response
   */
  private parseEntitiesFromResponse(response: string): Entity[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const entities = JSON.parse(jsonMatch[0]);
        return entities.map((entity: any, index: number) => ({
          id: `mastra_entity_${Date.now()}_${index}`,
          value: entity.value || entity.text || '',
          type: this.mapEntityType(entity.type || 'custom'),
          confidence: entity.confidence || 0.8,
          metadata: { source: 'mastra_agent', ...entity.metadata },
        }));
      }
    } catch (error) {
      logger.error('Error parsing entities from response:', error);
    }

    // Fallback to simple extraction
    return this.simpleEntityExtraction(response);
  }

  /**
   * Parse summary response from agent
   */
  private parseSummaryResponse(response: string): {
    text: string;
    keyPoints: string[];
    sentiment: string;
  } {
    const lines = response.split('\n').filter(line => line.trim());
    
    let text = '';
    let keyPoints: string[] = [];
    let sentiment = 'neutral';

    for (const line of lines) {
      if (line.includes('Summary:') || line.includes('summary:')) {
        text = line.replace(/Summary:\s*/i, '').trim();
      } else if (line.includes('•') || line.includes('-') || line.includes('*')) {
        keyPoints.push(line.replace(/[•\-*]\s*/, '').trim());
      } else if (line.includes('Sentiment:') || line.includes('sentiment:')) {
        const sentimentMatch = line.match(/(positive|negative|neutral)/i);
        if (sentimentMatch) {
          sentiment = sentimentMatch[1].toLowerCase();
        }
      }
    }

    if (!text) {
      text = response.substring(0, 200) + '...';
    }

    return { text, keyPoints, sentiment };
  }

  /**
   * Map entity types to our format
   */
  private mapEntityType(type: string): EntityType {
    const typeMap: Record<string, EntityType> = {
      PERSON: 'person',
      ORGANIZATION: 'organization',
      LOCATION: 'location',
      DATE: 'date',
      EMAIL: 'email',
      PHONE: 'phone',
      URL: 'url',
      PRODUCT: 'product',
      MONEY: 'money',
      PERCENTAGE: 'percentage',
      person: 'person',
      organization: 'organization',
      location: 'location',
      date: 'date',
      email: 'email',
      phone: 'phone',
      url: 'url',
      product: 'product',
      money: 'money',
      percentage: 'percentage',
    };

    return typeMap[type] || 'custom';
  }

  /**
   * Fallback entity extraction when Mastra is not available
   */
  private fallbackEntityExtraction(text: string): {
    entities: Entity[];
    summary: string;
    sentiment: string;
    topics: string[];
  } {
    const entities = this.simpleEntityExtraction(text);
    return {
      entities,
      summary: `Fallback extraction found ${entities.length} entities`,
      sentiment: this.analyzeSentiment(text),
      topics: this.extractTopics(text),
    };
  }

  /**
   * Simple pattern-based entity extraction
   */
  private simpleEntityExtraction(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract emails
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern) || [];
    emails.forEach((email, index) => {
      entities.push({
        id: `entity_${Date.now()}_${index}`,
        value: email,
        type: 'email',
        confidence: 0.9,
        metadata: { source: 'pattern_match' },
      });
    });

    // Extract URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern) || [];
    urls.forEach((url, index) => {
      entities.push({
        id: `entity_${Date.now()}_${index + emails.length}`,
        value: url,
        type: 'url',
        confidence: 0.9,
        metadata: { source: 'pattern_match' },
      });
    });

    return entities;
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): string {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract topics from text
   */
  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('work') || lowerText.includes('job') || lowerText.includes('career')) topics.push('work');
    if (lowerText.includes('family') || lowerText.includes('home') || lowerText.includes('personal')) topics.push('personal');
    if (lowerText.includes('technology') || lowerText.includes('ai') || lowerText.includes('software')) topics.push('technology');
    if (lowerText.includes('health') || lowerText.includes('medical') || lowerText.includes('doctor')) topics.push('health');

    return topics.length > 0 ? topics : ['conversation'];
  }

  /**
   * Fallback summary generation
   */
  private fallbackSummary(messages: Message[], entities: Entity[]): {
    text: string;
    keyPoints: string[];
    sentiment: string;
  } {
    const userMessages = messages.filter(m => m.type === 'user');
    const agentMessages = messages.filter(m => m.type === 'agent');
    
    return {
      text: `Conversation with ${userMessages.length} user messages and ${agentMessages.length} agent responses. Found ${entities.length} entities.`,
      keyPoints: [
        `User messages: ${userMessages.length}`,
        `Agent responses: ${agentMessages.length}`,
        `Entities found: ${entities.length}`,
      ],
      sentiment: 'neutral',
    };
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * List all available agents
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}

// Export singleton instance
export const mastraAgentService = new MastraAgentService(); 