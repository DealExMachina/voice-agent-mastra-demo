import type { Message } from '@voice-agent-mastra-demo/shared';
import { createTimestamp, generateId } from '@voice-agent-mastra-demo/shared';
import type { VoiceAgent } from '../agents/voiceAssistant.agent.js';

export function buildUserMessage(content: string, overrides: Partial<Message> = {} as any): Message {
  return {
    id: generateId(),
    content,
    userId: 'user-1',
    sessionId: 'session-1',
    timestamp: createTimestamp(),
    type: 'user',
    ...(overrides as any),
  } as Message;
}

export async function stepAgent(agent: VoiceAgent, content: string, overrides: Partial<Message> = {} as any) {
  const msg = buildUserMessage(content, overrides);
  return agent.processMessage(msg);
}