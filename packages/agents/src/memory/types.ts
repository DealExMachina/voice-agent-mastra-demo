import type { Memory } from '@voice-agent-mastra-demo/shared';

export interface MemoryStore {
  storeMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Promise<Memory>;
  listByUser(userId: string): Promise<Memory[]>;
  listBySession(sessionId: string): Promise<Memory[]>;
  search(query: string, opts?: { userId?: string; sessionId?: string }): Promise<Memory[]>;
  clear(): Promise<void>;
}