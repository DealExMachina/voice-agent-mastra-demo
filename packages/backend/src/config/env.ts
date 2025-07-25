import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3001'),
  
  // Frontend configuration
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // LiveKit configuration (required)
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required'),
  LIVEKIT_URL: z.string().url('LIVEKIT_URL must be a valid URL').default('wss://localhost:7880'),
  
  // Database configuration
  DATABASE_PATH: z.string().default('./data/voice-agent.db'),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Rate limiting configuration
  RATE_LIMIT_POINTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  RATE_LIMIT_DURATION: z.string().transform(Number).pipe(z.number().positive()).default('60'),
  TOKEN_RATE_LIMIT_POINTS: z.string().transform(Number).pipe(z.number().positive()).default('5'),
  
  // Session configuration
  SESSION_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()).default('1800000'), // 30 minutes
  
  // Optional AI configuration
  MASTRA_API_KEY: z.string().optional(),
  MASTRA_MODEL: z.string().optional(),
  MEM0_API_KEY: z.string().optional(),
  MEM0_DATABASE_URL: z.string().optional(),
});

// Validate environment variables
const envParseResult = envSchema.safeParse(process.env);

if (!envParseResult.success) {
  console.error('❌ Environment validation failed:');
  console.error(envParseResult.error.format());
  process.exit(1);
}

export const env = envParseResult.data;

// Type-safe environment configuration
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  FRONTEND_URL: string;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
  LIVEKIT_URL: string;
  DATABASE_PATH: string;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  RATE_LIMIT_POINTS: number;
  RATE_LIMIT_DURATION: number;
  TOKEN_RATE_LIMIT_POINTS: number;
  SESSION_TIMEOUT_MS: number;
  MASTRA_API_KEY?: string;
  MASTRA_MODEL?: string;
  MEM0_API_KEY?: string;
  MEM0_DATABASE_URL?: string;
}

// Export validated environment
export const config: Environment = env;

// Helper function to check if required AI services are configured
export function isAIServicesConfigured(): boolean {
  return !!(config.MASTRA_API_KEY && config.MEM0_API_KEY);
}

// Helper function to get database configuration
export function getDatabaseConfig() {
  return {
    path: config.DATABASE_PATH,
    readOnly: false,
  };
}

// Helper function to get LiveKit configuration
export function getLiveKitConfig() {
  return {
    apiKey: config.LIVEKIT_API_KEY,
    apiSecret: config.LIVEKIT_API_SECRET,
    url: config.LIVEKIT_URL,
  };
}

// Helper function to get rate limiting configuration
export function getRateLimitConfig() {
  return {
    general: {
      points: config.RATE_LIMIT_POINTS,
      duration: config.RATE_LIMIT_DURATION,
    },
    token: {
      points: config.TOKEN_RATE_LIMIT_POINTS,
      duration: config.RATE_LIMIT_DURATION,
    },
  };
}