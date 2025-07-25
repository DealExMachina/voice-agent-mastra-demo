import { logger } from '../utils/logger.js';
import { mastraLocalService } from './mastra-local.js';
import { mem0Service } from './mem0.js';
import type { Message, Entity, Memory, EntityType, MemoryType } from '@voice-agent-mastra-demo/shared';

export interface AIProcessingResult {
  entities: Entity[];
  memories: Memory[];
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics?: string[];
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  recentMessages: Message[];
  userMemories: Memory[];
  sessionMemories: Memory[];
}

export class AIIntegrationService {
  private isConfigured: boolean;

  constructor() {
    // Initialize as false, will be set properly in async method
    this.isConfigured = false;
  }

  /**
   * Initialize the AI integration service
   */
  async initialize(): Promise<void> {
    const mastraReady = await mastraLocalService.isReady();
    const mem0Ready = await mem0Service.isReady();
    this.isConfigured = mastraReady && mem0Ready;
  }

  /**
   * Check if AI services are properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Process a single message with entity extraction and memory storage
   */
  async processMessage(message: Message): Promise<AIProcessingResult> {
    if (!this.isConfigured) {
      logger.warn('AI services not configured, skipping message processing');
      return { entities: [], memories: [] };
    }

    try {
      // Extract entities using Mastra
      const mastraResult = await mastraLocalService.extractEntitiesFromMessage(message);
      
      // Create memories for extracted entities
      const memories: Memory[] = [];
      
      for (const entity of mastraResult.entities) {
        const memory: Omit<Memory, 'id' | 'timestamp'> = {
          type: this.mapEntityTypeToMemoryType(entity.type),
          content: `Entity: ${entity.value} (${entity.type})`,
          userId: message.type === 'user' ? (message as any).userId : 'agent',
          sessionId: message.sessionId,
          messageId: message.id,
          entities: [entity.value],
          metadata: {
            entityType: entity.type,
            confidence: entity.confidence,
            ...entity.metadata,
          },
          importance: entity.confidence,
          tags: [entity.type, 'entity'],
        };

        try {
          const storedMemory = await mem0Service.storeMemory(memory);
          memories.push(storedMemory);
        } catch (error) {
          logger.error('Failed to store entity memory:', error);
        }
      }

      // Create conversation memory
      const conversationMemory: Omit<Memory, 'id' | 'timestamp'> = {
        type: 'conversation',
        content: message.content,
        userId: message.type === 'user' ? (message as any).userId : 'agent',
        sessionId: message.sessionId,
        messageId: message.id,
        entities: mastraResult.entities.map(e => e.value),
        metadata: {
          sentiment: mastraResult.sentiment as 'positive' | 'negative' | 'neutral',
          topics: mastraResult.topics,
          summary: mastraResult.summary,
          messageType: message.type,
        },
        importance: this.calculateMessageImportance(message, mastraResult),
        tags: ['conversation', message.type, ...(mastraResult.topics || [])],
      };

      try {
        const storedConversationMemory = await mem0Service.storeMemory(conversationMemory);
        memories.push(storedConversationMemory);
      } catch (error) {
        logger.error('Failed to store conversation memory:', error);
      }

      logger.info(`Processed message ${message.id}: ${mastraResult.entities.length} entities, ${memories.length} memories`);

      return {
        entities: mastraResult.entities,
        memories,
        summary: mastraResult.summary,
        sentiment: mastraResult.sentiment as 'positive' | 'negative' | 'neutral',
        topics: mastraResult.topics,
      };
    } catch (error) {
      logger.error('Error processing message:', error);
      return { entities: [], memories: [] };
    }
  }

  /**
   * Process a conversation (multiple messages) with context
   */
  async processConversation(messages: Message[], context: ConversationContext): Promise<AIProcessingResult> {
    if (!this.isConfigured) {
      logger.warn('AI services not configured, skipping conversation processing');
      return { entities: [], memories: [] };
    }

    try {
      // Extract entities from the entire conversation
      const mastraResult = await mastraLocalService.extractEntitiesFromConversation(messages);
      
      // Get relevant memories for context
      const relevantMemories = await this.getRelevantMemories(context);
      
      // Create conversation-level memories
      const memories: Memory[] = [];
      
      // Store conversation summary memory
      if (mastraResult.summary) {
        const summaryMemory: Omit<Memory, 'id' | 'timestamp'> = {
          type: 'conversation',
          content: mastraResult.summary,
          userId: context.userId,
          sessionId: context.sessionId,
          entities: mastraResult.entities.map(e => e.value),
          metadata: {
            sentiment: mastraResult.sentiment as 'positive' | 'negative' | 'neutral',
            topics: mastraResult.topics,
            messageCount: messages.length,
            relevantMemoriesCount: relevantMemories.length,
          },
          importance: 0.8, // High importance for conversation summaries
          tags: ['conversation', 'summary', ...(mastraResult.topics || [])],
        };

        try {
          const storedSummaryMemory = await mem0Service.storeMemory(summaryMemory);
          memories.push(storedSummaryMemory);
        } catch (error) {
          logger.error('Failed to store conversation summary memory:', error);
        }
      }

      // Store entity memories with context
      for (const entity of mastraResult.entities) {
        const entityMemory: Omit<Memory, 'id' | 'timestamp'> = {
          type: this.mapEntityTypeToMemoryType(entity.type),
          content: `Entity in conversation: ${entity.value} (${entity.type})`,
          userId: context.userId,
          sessionId: context.sessionId,
          entities: [entity.value],
          metadata: {
            entityType: entity.type,
            confidence: entity.confidence,
            context: 'conversation',
            ...entity.metadata,
          },
          importance: entity.confidence * 0.9, // Slightly lower than individual message entities
          tags: [entity.type, 'entity', 'conversation'],
        };

        try {
          const storedEntityMemory = await mem0Service.storeMemory(entityMemory);
          memories.push(storedEntityMemory);
        } catch (error) {
          logger.error('Failed to store conversation entity memory:', error);
        }
      }

      logger.info(`Processed conversation: ${mastraResult.entities.length} entities, ${memories.length} memories`);

      return {
        entities: mastraResult.entities,
        memories,
        summary: mastraResult.summary,
        sentiment: mastraResult.sentiment as 'positive' | 'negative' | 'neutral',
        topics: mastraResult.topics,
      };
    } catch (error) {
      logger.error('Error processing conversation:', error);
      return { entities: [], memories: [] };
    }
  }

  /**
   * Get relevant memories for a conversation context
   */
  async getRelevantMemories(context: ConversationContext): Promise<Memory[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      // Get user memories
      const userMemories = await mem0Service.getUserMemories(context.userId);
      
      // Get session memories
      const sessionMemories = await mem0Service.getSessionMemories(context.sessionId);
      
      // Combine and deduplicate
      const allMemories = [...userMemories, ...sessionMemories];
      const uniqueMemories = this.deduplicateMemories(allMemories);
      
      // Sort by importance and recency
      const sortedMemories = uniqueMemories.sort((a, b) => {
        const importanceDiff = b.importance - a.importance;
        if (importanceDiff !== 0) return importanceDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      // Return top relevant memories
      return sortedMemories.slice(0, 20);
    } catch (error) {
      logger.error('Error getting relevant memories:', error);
      return [];
    }
  }

  /**
   * Search for memories related to a query
   */
  async searchMemories(query: string, userId: string, options: {
    sessionId?: string;
    limit?: number;
    minImportance?: number;
  } = {}): Promise<Memory[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const results = await mem0Service.searchMemories(query, {
        userId,
        sessionId: options.sessionId,
        limit: options.limit || 10,
        minImportance: options.minImportance || 0.3,
      });

      return results.flatMap(result => result.memories);
    } catch (error) {
      logger.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Get user memory statistics
   */
  async getUserMemoryStats(userId: string) {
    if (!this.isConfigured) {
      return {
        total: 0,
        byType: {},
        byImportance: {},
        recentActivity: 0,
      };
    }

    try {
      return await mem0Service.getUserMemoryStats(userId);
    } catch (error) {
      logger.error('Error getting user memory stats:', error);
      return {
        total: 0,
        byType: {},
        byImportance: {},
        recentActivity: 0,
      };
    }
  }

  /**
   * Map entity type to memory type
   */
  private mapEntityTypeToMemoryType(entityType: EntityType): MemoryType {
    const mapping: Record<EntityType, MemoryType> = {
      person: 'relationship',
      organization: 'fact',
      location: 'fact',
      date: 'context',
      time: 'context',
      money: 'fact',
      percentage: 'fact',
      email: 'fact',
      phone: 'fact',
      url: 'fact',
      product: 'preference',
      service: 'preference',
      event: 'context',
      concept: 'fact',
      custom: 'custom',
    };

    return mapping[entityType] || 'fact';
  }

  /**
   * Calculate message importance based on content and extracted data
   */
  private calculateMessageImportance(message: Message, mastraResult: any): number {
    let importance = 0.5; // Base importance

    // Higher importance for longer messages
    if (message.content.length > 100) importance += 0.1;
    if (message.content.length > 200) importance += 0.1;

    // Higher importance for messages with entities
    if (mastraResult.entities?.length > 0) importance += 0.2;

    // Higher importance for messages with strong sentiment
    if (mastraResult.sentiment === 'positive' || mastraResult.sentiment === 'negative') {
      importance += 0.1;
    }

    // Higher importance for agent responses with high confidence
    if (message.type === 'agent' && (message as any).confidence > 0.8) {
      importance += 0.1;
    }

    return Math.min(importance, 1.0);
  }

  /**
   * Deduplicate memories based on content and type
   */
  private deduplicateMemories(memories: Memory[]): Memory[] {
    const seen = new Set<string>();
    return memories.filter(memory => {
      const key = `${memory.type}-${memory.content}-${memory.userId}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Process real-time transcription for entity extraction
   */
  async processTranscription(transcriptionMessage: any): Promise<AIProcessingResult> {
    if (!this.isConfigured) {
      logger.warn('AI services not configured, skipping transcription processing');
      return { entities: [], memories: [] };
    }

    try {
      // Extract entities from transcription
      const mastraResult = await mastraLocalService.extractEntitiesFromText(
        transcriptionMessage.content
      );

      // Store transcription as memory
      const transcriptionMemory: Omit<Memory, 'id' | 'timestamp'> = {
        type: 'conversation',
        content: transcriptionMessage.content,
        userId: 'user', // This should come from session
        sessionId: transcriptionMessage.sessionId,
        messageId: transcriptionMessage.id,
        entities: mastraResult.entities.map(e => e.value),
        metadata: {
          isTranscription: true,
          confidence: transcriptionMessage.confidence,
          isFinal: transcriptionMessage.isFinal,
        },
        importance: 0.7,
        tags: ['transcription', 'voice'],
      };

      const storedMemory = await mem0Service.storeMemory(transcriptionMemory);

      return {
        entities: mastraResult.entities,
        memories: [storedMemory],
        summary: mastraResult.summary,
        sentiment: mastraResult.sentiment as 'positive' | 'negative' | 'neutral',
        topics: mastraResult.topics,
      };
    } catch (error) {
      logger.error('Error processing transcription:', error);
      return { entities: [], memories: [] };
    }
  }

  /**
   * Generate conversation summary using AI
   */
  async generateConversationSummary(
    messages: Message[],
    entities: Entity[],
    sessionId: string
  ): Promise<any> {
    if (!this.isConfigured) {
      logger.warn('AI services not configured, generating basic summary');
      return this.generateBasicSummary(messages, entities, sessionId);
    }

    try {
      // Use Mastra to generate comprehensive summary
      const summary = await mastraLocalService.generateSummary(messages, entities);
      
      return {
        id: `summary_${Date.now()}`,
        sessionId,
        summary: summary.text,
        keyPoints: summary.keyPoints,
        entities,
        sentiment: summary.sentiment,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error generating AI summary:', error);
      return this.generateBasicSummary(messages, entities, sessionId);
    }
  }

  /**
   * Generate basic summary when AI services are not available
   */
  private generateBasicSummary(
    messages: Message[],
    entities: Entity[],
    sessionId: string
  ): any {
    const userMessages = messages.filter(m => m.type === 'user');
    const agentMessages = messages.filter(m => m.type === 'agent');
    
    return {
      id: `summary_${Date.now()}`,
      sessionId,
      summary: `Conversation with ${userMessages.length} user messages and ${agentMessages.length} agent responses.`,
      keyPoints: [
        `Total messages: ${messages.length}`,
        `Unique entities: ${entities.length}`,
        `Conversation duration: ${this.calculateDuration(messages)}`,
      ],
      entities,
      sentiment: 'neutral',
      timestamp: new Date(),
    };
  }

  /**
   * Calculate conversation duration
   */
  private calculateDuration(messages: Message[]): string {
    if (messages.length < 2) return '0 minutes';
    
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    const durationMs = lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime();
    const minutes = Math.round(durationMs / (1000 * 60));
    
    return `${minutes} minutes`;
  }
}

// Export singleton instance
export const aiIntegrationService = new AIIntegrationService(); 