import { GenerateTextParams, LlmProvider } from './types.js';

export function createMockLlm(responses: Record<string, string> = {}): LlmProvider {
  return {
    async generateText({ prompt }: GenerateTextParams): Promise<string> {
      for (const [key, value] of Object.entries(responses)) {
        if (prompt.includes(key)) return value;
      }
      // Default deterministic fallback: echo with marker
      return `MOCK_RESPONSE:${prompt.slice(0, 32)}`;
    },
  };
}