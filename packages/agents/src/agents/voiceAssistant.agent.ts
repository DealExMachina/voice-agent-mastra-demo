import type { Message, Memory, Entity } from '@voice-agent-mastra-demo/shared';
import { MAX_MESSAGE_LENGTH } from '@voice-agent-mastra-demo/shared';
import type { LlmProvider } from '../llm/types.js';
import type { MemoryStore } from '../memory/types.js';

export interface AgentDeps {
  llm: LlmProvider;
  memory: MemoryStore;
}

export interface AgentResult {
  entities: Entity[];
  memories: Memory[];
  summary?: string;
}

export interface VoiceAgent {
  processMessage(message: Message): Promise<AgentResult>;
}

export function createVoiceAgent(deps: AgentDeps): VoiceAgent {
  return {
    async processMessage(message: Message): Promise<AgentResult> {
      const content = (message as any).content ?? '';
      if (!content || content.length > MAX_MESSAGE_LENGTH) {
        return { entities: [], memories: [] };
      }

      const prompt = `Extract entities and a short summary from: ${content}`;
      const llmText = await deps.llm.generateText({ prompt, temperature: 0 });

      // Extremely simple/deterministic entity extraction to enable unit testing
      const entities: Entity[] = [];
      const emailRegex = /[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g;
      const urlRegex = /https?:\/\/\S+/g;

      const emails = content.match(emailRegex) ?? [];
      const urls = content.match(urlRegex) ?? [];

      for (const e of emails) {
        entities.push({ id: e, type: 'email', value: e, confidence: 0.9 });
      }
      for (const u of urls) {
        entities.push({ id: u, type: 'url', value: u, confidence: 0.8 });
      }

      const memories: Memory[] = [];
      const baseMemory = {
        type: 'conversation' as const,
        content,
        userId: (message as any).userId ?? 'unknown',
        sessionId: (message as any).sessionId,
        messageId: (message as any).id,
        entities: entities.map(e => e.value),
        metadata: { llm: llmText.slice(0, 64) },
        importance: 0.5,
        tags: ['conversation'],
      } satisfies Omit<Memory, 'id' | 'timestamp'>;

      const stored = await deps.memory.storeMemory(baseMemory);
      memories.push(stored);

      return {
        entities,
        memories,
        summary: llmText,
      };
    },
  };
}