import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../services/database.js';
import { mockSessions, mockMessages, mockUsers, createTestSession, createTestMessage, createTestUser } from './fixtures.js';

// Mock DuckDB completely
vi.mock('duckdb', () => ({
  Database: vi.fn(),
  Connection: vi.fn(),
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
    
    // Mock the internal methods to avoid actual database calls
    vi.spyOn(dbService as any, 'run').mockResolvedValue(undefined);
    vi.spyOn(dbService as any, 'all').mockResolvedValue([]);
    vi.spyOn(dbService as any, 'get').mockResolvedValue(null);
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

  describe('User Operations', () => {
    it('should have createUser method', () => {
      expect(typeof dbService.createUser).toBe('function');
    });

    it('should have getUser method', () => {
      expect(typeof dbService.getUser).toBe('function');
    });
  });
});