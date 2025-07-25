import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../services/database.js';

// Mock better-sqlite3 completely
vi.mock('better-sqlite3', () => ({
  default: vi.fn().mockImplementation(() => ({
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn().mockReturnValue({ changes: 1 }),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
    close: vi.fn(),
  })),
}));

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a simple mock for the database service
    dbService = new DatabaseService();
  });

  afterEach(async () => {
    if (dbService) {
      await dbService.close();
    }
  });

  describe('Basic Functionality', () => {
    it('should be able to create a DatabaseService instance', () => {
      expect(dbService).toBeInstanceOf(DatabaseService);
    });

    it('should have initialize method', () => {
      expect(typeof dbService.initialize).toBe('function');
    });

    it('should have close method', () => {
      expect(typeof dbService.close).toBe('function');
    });
  });

  describe('Session Operations', () => {
    it('should have createSession method', () => {
      expect(typeof dbService.createSession).toBe('function');
    });

    it('should have getSession method', () => {
      expect(typeof dbService.getSession).toBe('function');
    });

    it('should have updateSession method', () => {
      expect(typeof dbService.updateSession).toBe('function');
    });
  });

  describe('Message Operations', () => {
    it('should have addMessage method', () => {
      expect(typeof dbService.addMessage).toBe('function');
    });

    it('should have getSessionMessages method', () => {
      expect(typeof dbService.getSessionMessages).toBe('function');
    });
  });

  describe('Health Check', () => {
    it('should have healthCheck method', () => {
      expect(typeof dbService.healthCheck).toBe('function');
    });
  });
});