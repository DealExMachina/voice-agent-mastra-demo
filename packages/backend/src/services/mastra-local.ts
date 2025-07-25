import { logger } from '../utils/logger.js';
import type { Message, Entity, EntityType } from '@voice-agent-mastra-demo/shared';

export class MastraLocalService {
  private isConfigured: boolean = false;

  constructor() {
    // Check if we have the required environment variables
    this.isConfigured = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  }

  async isReady(): Promise<boolean> {
    return this.isConfigured;
  }

  async extractEntitiesFromMessage(message: Message): Promise<{
    entities: Entity[];
    summary: string;
    sentiment: string;
    topics: string[];
  }> {
    try {
      // Simple pattern-based entity extraction
      const entities: Entity[] = [];
      const text = message.content;
      
      // Extract names (simple pattern)
      const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
      const names = text.match(namePattern);
      if (names) {
        names.forEach((name: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: name,
            type: 'person' as EntityType,
            confidence: 0.8,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract organizations (simple pattern)
      const orgPattern = /\b[A-Z][a-z]+ (Inc|Corp|LLC|Ltd|Company|Corporation)\b/g;
      const orgs = text.match(orgPattern);
      if (orgs) {
        orgs.forEach((org: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: org,
            type: 'organization' as EntityType,
            confidence: 0.7,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract emails
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = text.match(emailPattern);
      if (emails) {
        emails.forEach((email: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: email,
            type: 'email' as EntityType,
            confidence: 0.9,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract URLs
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = text.match(urlPattern);
      if (urls) {
        urls.forEach((url: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: url,
            type: 'url' as EntityType,
            confidence: 0.9,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract phone numbers
      const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const phones = text.match(phonePattern);
      if (phones) {
        phones.forEach((phone: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: phone,
            type: 'phone' as EntityType,
            confidence: 0.8,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract dates
      const datePattern = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b/g;
      const dates = text.match(datePattern);
      if (dates) {
        dates.forEach((date: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: date,
            type: 'date' as EntityType,
            confidence: 0.7,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Simple sentiment analysis based on keywords
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'happy', 'excited'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed'];
      
      const lowerText = text.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
      
      let sentiment = 'neutral';
      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';
      
      // Simple topic extraction
      const topics: string[] = [];
      if (lowerText.includes('work') || lowerText.includes('job') || lowerText.includes('career')) topics.push('work');
      if (lowerText.includes('family') || lowerText.includes('home') || lowerText.includes('personal')) topics.push('personal');
      if (lowerText.includes('technology') || lowerText.includes('ai') || lowerText.includes('software')) topics.push('technology');
      if (lowerText.includes('health') || lowerText.includes('medical') || lowerText.includes('doctor')) topics.push('health');
      
      return {
        entities,
        summary: `Extracted ${entities.length} entities from message`,
        sentiment,
        topics: topics.length > 0 ? topics : ['conversation']
      };
    } catch (error) {
      logger.error('Error extracting entities from message:', error);
      return {
        entities: [],
        summary: 'Error extracting entities',
        sentiment: 'neutral',
        topics: []
      };
    }
  }

  async extractEntitiesFromConversation(messages: Message[]): Promise<{
    entities: Entity[];
    summary: string;
    sentiment: string;
    topics: string[];
  }> {
    try {
      // Combine all messages and extract entities
      const conversationText = messages.map(m => m.content).join('\n');
      
      // Create a mock message for the conversation
      const mockMessage: Message = {
        id: 'conversation-entity-extraction',
        content: conversationText,
        timestamp: new Date(),
        sessionId: messages[0]?.sessionId || 'unknown',
        type: 'user',
        userId: (messages[0] as any)?.userId || 'unknown',
      };
      
      return await this.extractEntitiesFromMessage(mockMessage);
    } catch (error) {
      logger.error('Error extracting entities from conversation:', error);
      return {
        entities: [],
        summary: 'Error extracting entities from conversation',
        sentiment: 'neutral',
        topics: []
      };
    }
  }

  async storeMemory(content: string, type: string = 'fact', importance: number = 0.5, tags: string[] = [], metadata: any = {}): Promise<any> {
    try {
      // For now, just log the memory
      logger.info(`Storing memory: ${content} (type: ${type}, importance: ${importance})`);
      
      return {
        id: `memory_${Date.now()}_${Math.random()}`,
        content,
        type,
        importance,
        tags,
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error storing memory:', error);
      return null;
    }
  }

  async getSupportedEntityTypes(): Promise<EntityType[]> {
    return [
      'person',
      'organization', 
      'location',
      'date',
      'time',
      'money',
      'percentage',
      'email',
      'phone',
      'url',
      'product',
      'service',
      'event',
      'concept',
      'custom'
    ];
  }

  /**
   * Extract entities from plain text (for transcription processing)
   */
  async extractEntitiesFromText(text: string): Promise<{
    entities: Entity[];
    summary: string;
    sentiment: string;
    topics: string[];
  }> {
    try {
      // Simple pattern-based entity extraction
      const entities: Entity[] = [];
      
      // Extract names (simple pattern)
      const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
      const names = text.match(namePattern);
      if (names) {
        names.forEach((name: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: name,
            type: 'person' as EntityType,
            confidence: 0.8,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract organizations (simple pattern)
      const orgPattern = /\b[A-Z][a-z]+ (Inc|Corp|LLC|Ltd|Company|Corporation)\b/g;
      const orgs = text.match(orgPattern);
      if (orgs) {
        orgs.forEach((org: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: org,
            type: 'organization' as EntityType,
            confidence: 0.7,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract emails
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = text.match(emailPattern);
      if (emails) {
        emails.forEach((email: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: email,
            type: 'email' as EntityType,
            confidence: 0.9,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract URLs
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = text.match(urlPattern);
      if (urls) {
        urls.forEach((url: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: url,
            type: 'url' as EntityType,
            confidence: 0.9,
            metadata: { source: 'pattern_match' }
          });
        });
      }
      
      // Extract phone numbers
      const phonePattern = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const phones = text.match(phonePattern);
      if (phones) {
        phones.forEach((phone: string) => {
          entities.push({
            id: `entity_${Date.now()}_${Math.random()}`,
            value: phone,
            type: 'phone' as EntityType,
            confidence: 0.8,
            metadata: { source: 'pattern_match' }
          });
        });
      }

      // Simple sentiment analysis
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated'];
      
      const words = text.toLowerCase().split(/\s+/);
      const positiveCount = words.filter(word => positiveWords.includes(word)).length;
      const negativeCount = words.filter(word => negativeWords.includes(word)).length;
      
      let sentiment = 'neutral';
      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';

      // Simple topic extraction
      const topics = entities.map(e => e.type).filter((value, index, self) => self.indexOf(value) === index);

      return {
        entities,
        summary: `Extracted ${entities.length} entities from text`,
        sentiment,
        topics,
      };
    } catch (error) {
      logger.error('Error extracting entities from text:', error);
      return {
        entities: [],
        summary: 'Failed to extract entities',
        sentiment: 'neutral',
        topics: [],
      };
    }
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(messages: any[], entities: Entity[]): Promise<{
    text: string;
    keyPoints: string[];
    sentiment: string;
  }> {
    try {
      const userMessages = messages.filter(m => m.type === 'user');
      const agentMessages = messages.filter(m => m.type === 'agent');
      
      const summary = `Conversation summary: ${userMessages.length} user messages and ${agentMessages.length} agent responses. ` +
        `Key entities identified: ${entities.map(e => e.value).join(', ')}. ` +
        `Total conversation length: ${messages.length} messages.`;

      const keyPoints = [
        `User messages: ${userMessages.length}`,
        `Agent responses: ${agentMessages.length}`,
        `Entities found: ${entities.length}`,
        `Entity types: ${entities.map(e => e.type).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`,
      ];

      // Simple sentiment analysis
      const allContent = messages.map(m => m.content).join(' ').toLowerCase();
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated'];
      
      const words = allContent.split(/\s+/);
      const positiveCount = words.filter(word => positiveWords.includes(word)).length;
      const negativeCount = words.filter(word => negativeWords.includes(word)).length;
      
      let sentiment = 'neutral';
      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';

      return {
        text: summary,
        keyPoints,
        sentiment,
      };
    } catch (error) {
      logger.error('Error generating summary:', error);
      return {
        text: 'Failed to generate summary',
        keyPoints: ['Error occurred during summary generation'],
        sentiment: 'neutral',
      };
    }
  }
}

export const mastraLocalService = new MastraLocalService(); 