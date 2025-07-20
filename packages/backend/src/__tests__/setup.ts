import { beforeAll, afterAll } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.LOG_LEVEL = 'error';

// Mock environment variables for testing
process.env.LIVEKIT_API_KEY = 'test-api-key';
process.env.LIVEKIT_API_SECRET = 'test-api-secret';
process.env.LIVEKIT_URL = 'wss://test.livekit.io';
process.env.DATABASE_PATH = ':memory:'; // Use in-memory database for tests

beforeAll(async () => {
  // Global test setup
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Global test cleanup
  console.log('Cleaning up test environment...');
});