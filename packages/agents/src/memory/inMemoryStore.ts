import type { Memory } from '@voice-agent-mastra-demo/shared';
import { generateId, createTimestamp } from '@voice-agent-mastra-demo/shared';
import type { MemoryStore } from './types.js';

export class InMemoryStore implements MemoryStore {
  private memories: Memory[] = [];

  async storeMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Promise<Memory> {
    const stored: Memory = {
      id: generateId(),
      timestamp: createTimestamp(),
      ...memory,
    };
    this.memories.push(stored);
    return stored;
  }

  async listByUser(userId: string): Promise<Memory[]> {
    return this.memories.filter(m => m.userId === userId);
  }

  async listBySession(sessionId: string): Promise<Memory[]> {
    return this.memories.filter(m => m.sessionId === sessionId);
  }

  async search(query: string, opts?: { userId?: string; sessionId?: string }): Promise<Memory[]> {
    const lower = query.toLowerCase();
    return this.memories.filter(m => {
      const contentMatch = m.content.toLowerCase().includes(lower);
      const userMatch = opts?.userId ? m.userId === opts.userId : true;
      const sessionMatch = opts?.sessionId ? m.sessionId === opts.sessionId : true;
      return contentMatch && userMatch && sessionMatch;
    });
  }

  async clear(): Promise<void> {
    this.memories = [];
  }
}