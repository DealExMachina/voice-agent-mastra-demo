import { z } from 'zod';

// Environment validation schema for frontend
const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:3001'),
  VITE_APP_NAME: z.string().default('Voice Agent Mastra Demo'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
  VITE_ENVIRONMENT: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate environment variables
const envParseResult = envSchema.safeParse(import.meta.env as Record<string, string>);

if (!envParseResult.success) {
  console.error('❌ Frontend environment validation failed:');
  console.error(envParseResult.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = envParseResult.data;

// Type-safe environment configuration
export interface FrontendEnvironment {
  VITE_API_URL: string;
  VITE_APP_NAME: string;
  VITE_APP_VERSION: string;
  VITE_ENVIRONMENT: 'development' | 'production' | 'test';
}

// Export validated environment
export const config: FrontendEnvironment = env;

// Helper functions
export function getApiUrl(): string {
  return config.VITE_API_URL;
}

export function isDevelopment(): boolean {
  return config.VITE_ENVIRONMENT === 'development';
}

export function isProduction(): boolean {
  return config.VITE_ENVIRONMENT === 'production';
}