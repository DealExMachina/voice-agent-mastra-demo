import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Message, Memory, MemoryType } from '@voice-agent-mastra-demo/shared';

export interface Mem0Memory {
  id: string;
  type: MemoryType;
  content: string;
  userId: string;
  sessionId?: string;
  messageId?: string;
  entities?: string[];
  metadata?: Record<string, unknown>;
  timestamp: Date;
  importance: number; // 0-1 scale
  tags?: string[];
}

export interface Mem0QueryResult {
  memories: Mem0Memory[];
  relevance: number;
  metadata?: Record<string, unknown>;
}

export interface Mem0SearchOptions {
  userId?: string;
  sessionId?: string;
  type?: MemoryType;
  tags?: string[];
  limit?: number;
  minImportance?: number;
  startDate?: Date;
  endDate?: Date;
}

export class Mem0Service {
  private apiKey: string;
  private databaseUrl: string;
  private baseUrl: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = config.MEM0_API_KEY || '';
    this.databaseUrl = config.MEM0_DATABASE_URL || '';
    this.baseUrl = 'https://api.mem0.ai/v1';
    this.isConfigured = !!(this.apiKey && this.databaseUrl);
  }

  /**
   * Check if MEM0 is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Store a memory in MEM0
   */
  async storeMemory(memory: Omit<Mem0Memory, 'id' | 'timestamp'>): Promise<Mem0Memory> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping memory storage');
      throw new Error('MEM0 not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...memory,
          timestamp: new Date().toISOString(),
          database_url: this.databaseUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Stored memory ${result.id} for user ${memory.userId}`);
      
      return {
        ...memory,
        id: result.id,
        timestamp: new Date(result.timestamp),
      };
    } catch (error) {
      logger.error('Error storing memory:', error);
      throw error;
    }
  }

  /**
   * Store multiple memories in batch
   */
  async storeMemories(memories: Omit<Mem0Memory, 'id' | 'timestamp'>[]): Promise<Mem0Memory[]> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping batch memory storage');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memories: memories.map(memory => ({
            ...memory,
            timestamp: new Date().toISOString(),
          })),
          database_url: this.databaseUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Stored ${result.memories?.length || 0} memories in batch`);
      
      return result.memories || [];
    } catch (error) {
      logger.error('Error storing memories in batch:', error);
      throw error;
    }
  }

  /**
   * Search for memories based on query and options
   */
  async searchMemories(query: string, options: Mem0SearchOptions = {}): Promise<Mem0QueryResult[]> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping memory search');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          database_url: this.databaseUrl,
          ...options,
          start_date: options.startDate?.toISOString(),
          end_date: options.endDate?.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Found ${result.results?.length || 0} memories for query: ${query}`);
      
      return result.results || [];
    } catch (error) {
      logger.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Get memories for a specific user
   */
  async getUserMemories(userId: string, options: Omit<Mem0SearchOptions, 'userId'> = {}): Promise<Mem0Memory[]> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping user memory retrieval');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/user/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Retrieved ${result.memories?.length || 0} memories for user ${userId}`);
      
      return result.memories || [];
    } catch (error) {
      logger.error('Error retrieving user memories:', error);
      return [];
    }
  }

  /**
   * Get memories for a specific session
   */
  async getSessionMemories(sessionId: string): Promise<Mem0Memory[]> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping session memory retrieval');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Retrieved ${result.memories?.length || 0} memories for session ${sessionId}`);
      
      return result.memories || [];
    } catch (error) {
      logger.error('Error retrieving session memories:', error);
      return [];
    }
  }

  /**
   * Update memory importance
   */
  async updateMemoryImportance(memoryId: string, importance: number): Promise<void> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping memory importance update');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/${memoryId}/importance`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importance,
          database_url: this.databaseUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      logger.info(`Updated importance for memory ${memoryId} to ${importance}`);
    } catch (error) {
      logger.error('Error updating memory importance:', error);
      throw error;
    }
  }

  /**
   * Add tags to a memory
   */
  async addMemoryTags(memoryId: string, tags: string[]): Promise<void> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping memory tag addition');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/${memoryId}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags,
          database_url: this.databaseUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      logger.info(`Added tags ${tags.join(', ')} to memory ${memoryId}`);
    } catch (error) {
      logger.error('Error adding memory tags:', error);
      throw error;
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string): Promise<void> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping memory deletion');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/${memoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_url: this.databaseUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      logger.info(`Deleted memory ${memoryId}`);
    } catch (error) {
      logger.error('Error deleting memory:', error);
      throw error;
    }
  }

  /**
   * Get memory statistics for a user
   */
  async getUserMemoryStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byImportance: Record<string, number>;
    recentActivity: number;
  }> {
    if (!this.isConfigured) {
      logger.warn('MEM0 not configured, skipping memory statistics');
      return {
        total: 0,
        byType: {},
        byImportance: {},
        recentActivity: 0,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/user/${userId}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MEM0 API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      logger.info(`Retrieved memory statistics for user ${userId}`);
      
      return result.stats || {
        total: 0,
        byType: {},
        byImportance: {},
        recentActivity: 0,
      };
    } catch (error) {
      logger.error('Error retrieving memory statistics:', error);
      return {
        total: 0,
        byType: {},
        byImportance: {},
        recentActivity: 0,
      };
    }
  }
}

// Export singleton instance
export const mem0Service = new Mem0Service(); 