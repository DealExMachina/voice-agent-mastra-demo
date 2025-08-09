import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLlm, InMemoryStore, createVoiceAgent, stepAgent } from '../../index.js';

describe('VoiceAgent', () => {
  let memory: InMemoryStore;

  beforeEach(async () => {
    memory = new InMemoryStore();
    await memory.clear();
  });

  it('stores a conversation memory and extracts simple entities', async () => {
    const llm = createMockLlm({ Extract: 'summary:hello' });
    const agent = createVoiceAgent({ llm, memory });

    const text = 'Contact me at a@b.com and visit https://example.com';
    const result = await stepAgent(agent, text);

    expect(result.summary).toBeDefined();
    expect(result.entities.map(e => e.type).sort()).toEqual(['email', 'url']);

    const byUser = await memory.listByUser('user-1');
    expect(byUser.length).toBe(1);
    expect(byUser[0].content).toBe(text);
    expect(byUser[0].entities).toContain('a@b.com');
  });

  it('returns empty on overly long message', async () => {
    const llm = createMockLlm();
    const agent = createVoiceAgent({ llm, memory });

    const longText = 'x'.repeat(5000);
    const result = await stepAgent(agent, longText);
    expect(result.entities.length).toBe(0);
    expect(result.memories.length).toBe(0);
  });
});