import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Message, Entity, EntityType } from '@voice-agent-mastra-demo/shared';

export interface MastraEntity {
  id: string;
  type: EntityType;
  value: string;
  confidence: number;
  metadata?: Record<string, unknown>;
  startIndex?: number;
  endIndex?: number;
}

export interface MastraExtractionResult {
  entities: MastraEntity[];
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics?: string[];
  metadata?: Record<string, unknown>;
}

export class MastraService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = config.MASTRA_API_KEY || '';
    this.model = config.MASTRA_MODEL || 'mastra-v1';
    this.baseUrl = 'https://api.mastra.ai/v1';
    this.isConfigured = !!this.apiKey;
  }

  /**
   * Check if Mastra is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Extract entities from a single message
   */
  async extractEntitiesFromMessage(message: Message): Promise<MastraExtractionResult> {
    if (!this.isConfigured) {
      logger.warn('Mastra not configured, skipping entity extraction');
      return { entities: [] };
    }

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message.content,
          model: this.model,
          extract_entities: true,
          extract_sentiment: true,
          extract_topics: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mastra API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Extracted ${result.entities?.length || 0} entities from message ${message.id}`);
      
      return {
        entities: result.entities || [],
        summary: result.summary,
        sentiment: result.sentiment,
        topics: result.topics,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('Error extracting entities from message:', error);
      return { entities: [] };
    }
  }

  /**
   * Extract entities from a conversation (multiple messages)
   */
  async extractEntitiesFromConversation(messages: Message[]): Promise<MastraExtractionResult> {
    if (!this.isConfigured) {
      logger.warn('Mastra not configured, skipping conversation entity extraction');
      return { entities: [] };
    }

    try {
      const conversationText = messages
        .map(msg => `${msg.type === 'user' ? 'User' : 'Agent'}: ${msg.content}`)
        .join('\n');

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: conversationText,
          model: this.model,
          extract_entities: true,
          extract_sentiment: true,
          extract_topics: true,
          context: 'conversation',
        }),
      });

      if (!response.ok) {
        throw new Error(`Mastra API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Extracted ${result.entities?.length || 0} entities from conversation`);
      
      return {
        entities: result.entities || [],
        summary: result.summary,
        sentiment: result.sentiment,
        topics: result.topics,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('Error extracting entities from conversation:', error);
      return { entities: [] };
    }
  }

  /**
   * Extract entities from a session (all messages in a session)
   */
  async extractEntitiesFromSession(sessionId: string, messages: Message[]): Promise<MastraExtractionResult> {
    if (!this.isConfigured) {
      logger.warn('Mastra not configured, skipping session entity extraction');
      return { entities: [] };
    }

    try {
      const sessionText = messages
        .map(msg => `${msg.type === 'user' ? 'User' : 'Agent'}: ${msg.content}`)
        .join('\n');

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sessionText,
          model: this.model,
          extract_entities: true,
          extract_sentiment: true,
          extract_topics: true,
          context: 'session',
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mastra API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Extracted ${result.entities?.length || 0} entities from session ${sessionId}`);
      
      return {
        entities: result.entities || [],
        summary: result.summary,
        sentiment: result.sentiment,
        topics: result.topics,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('Error extracting entities from session:', error);
      return { entities: [] };
    }
  }

  /**
   * Get entity types supported by Mastra
   */
  async getSupportedEntityTypes(): Promise<EntityType[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/entity-types`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Mastra API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      return result.entity_types || [];
    } catch (error) {
      logger.error('Error fetching supported entity types:', error);
      return [];
    }
  }
}

// Export singleton instance
export const mastraService = new MastraService(); 