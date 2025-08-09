export interface GenerateTextParams {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmProvider {
  generateText(params: GenerateTextParams): Promise<string>;
}