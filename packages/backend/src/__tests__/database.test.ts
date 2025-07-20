import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../services/database.js';
import { mockSessions, mockMessages, mockUsers, createTestSession, createTestMessage, createTestUser } from './fixtures.js';

// Mock DuckDB
vi.mock('duckdb', () => ({
  Database: vi.fn().mockImplementation(() => ({
    exec: vi.fn(),
    all: vi.fn(),
    close: vi.fn(),
  })),
  Connection: vi.fn().mockImplementation(() => ({
    exec: vi.fn(),
    all: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  })),
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let mockDb: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock database connection
    mockDb = {
      exec: vi.fn(),
      all: vi.fn(),
      close: vi.fn(),
    };

    // Mock the database connection
    const duckdb = await import('duckdb');
    (duckdb.Database as any).mockImplementation(() => mockDb);
    (duckdb.Connection as any).mockImplementation(() => mockDb);

    dbService = new DatabaseService(':memory:');
    await dbService.initialize();
  });

  afterEach(async () => {
    if (dbService) {
      await dbService.close();
    }
  });

  describe('initialize', () => {
    it('should create database tables', async () => {
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS sessions'));
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS messages'));
      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS users'));
    });
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const session = createTestSession();
      mockDb.all.mockResolvedValueOnce([{ id: session.id }]);

      const result = await dbService.createSession(session);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([session.id, session.userId])
      );
      expect(result).toEqual(session);
    });

    it('should get a session by ID', async () => {
      const session = mockSessions[0];
      mockDb.all.mockResolvedValueOnce([{
        id: session.id,
        user_id: session.userId,
        start_time: session.startTime.toISOString(),
        end_time: session.endTime?.toISOString(),
        status: session.status,
        metadata: JSON.stringify(session.metadata),
      }]);

      const result = await dbService.getSession(session.id);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sessions WHERE id = ?'),
        [session.id]
      );
      expect(result?.id).toBe(session.id);
    });

    it('should return null for non-existent session', async () => {
      mockDb.all.mockResolvedValueOnce([]);

      const result = await dbService.getSession('non-existent');
      
      expect(result).toBeNull();
    });

    it('should update session status', async () => {
      const sessionId = 'session-1';
      const newStatus = 'ended';
      mockDb.all.mockResolvedValueOnce([{ id: sessionId }]);

      await dbService.updateSessionStatus(sessionId, newStatus);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET status = ?'),
        [newStatus, sessionId]
      );
    });

    it('should get sessions by user ID', async () => {
      const userId = 'user-1';
      mockDb.all.mockResolvedValueOnce([
        {
          id: 'session-1',
          user_id: userId,
          start_time: new Date().toISOString(),
          status: 'active',
          metadata: '{}',
        },
      ]);

      const result = await dbService.getSessionsByUserId(userId);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sessions WHERE user_id = ?'),
        [userId]
      );
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userId);
    });
  });

  describe('Message Management', () => {
    it('should create a new message', async () => {
      const message = createTestMessage();
      mockDb.all.mockResolvedValueOnce([{ id: message.id }]);

      const result = await dbService.createMessage(message);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        expect.arrayContaining([message.id, message.content])
      );
      expect(result).toEqual(message);
    });

    it('should get messages by session ID', async () => {
      const sessionId = 'session-1';
      mockDb.all.mockResolvedValueOnce([
        {
          id: 'msg-1',
          content: 'Test message',
          timestamp: new Date().toISOString(),
          user_id: 'user-1',
          session_id: sessionId,
          type: 'user',
          confidence: null,
          metadata: null,
        },
      ]);

      const result = await dbService.getMessagesBySessionId(sessionId);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM messages WHERE session_id = ?'),
        [sessionId]
      );
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(sessionId);
    });

    it('should get all messages', async () => {
      mockDb.all.mockResolvedValueOnce([
        {
          id: 'msg-1',
          content: 'Test message',
          timestamp: new Date().toISOString(),
          user_id: 'user-1',
          session_id: 'session-1',
          type: 'user',
          confidence: null,
          metadata: null,
        },
      ]);

      const result = await dbService.getAllMessages();
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM messages')
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('User Management', () => {
    it('should create a new user', async () => {
      const user = createTestUser();
      mockDb.all.mockResolvedValueOnce([{ id: user.id }]);

      const result = await dbService.createUser(user);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([user.id, user.name, user.email])
      );
      expect(result).toEqual(user);
    });

    it('should get a user by ID', async () => {
      const user = mockUsers[0];
      mockDb.all.mockResolvedValueOnce([{
        id: user.id,
        name: user.name,
        email: user.email,
        preferences: JSON.stringify(user.preferences),
      }]);

      const result = await dbService.getUser(user.id);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = ?'),
        [user.id]
      );
      expect(result?.id).toBe(user.id);
    });

    it('should return null for non-existent user', async () => {
      mockDb.all.mockResolvedValueOnce([]);

      const result = await dbService.getUser('non-existent');
      
      expect(result).toBeNull();
    });

    it('should update user preferences', async () => {
      const userId = 'user-1';
      const newPreferences = {
        language: 'fr',
        voiceSpeed: 1.5,
        voiceType: 'male',
        notifications: false,
      };
      mockDb.all.mockResolvedValueOnce([{ id: userId }]);

      await dbService.updateUserPreferences(userId, newPreferences);
      
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET preferences = ?'),
        [JSON.stringify(newPreferences), userId]
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.all.mockRejectedValueOnce(new Error('Database error'));

      await expect(dbService.createSession(createTestSession())).rejects.toThrow('Database error');
    });

    it('should handle invalid JSON in metadata', async () => {
      const session = createTestSession();
      mockDb.all.mockResolvedValueOnce([{
        id: session.id,
        user_id: session.userId,
        start_time: session.startTime.toISOString(),
        status: session.status,
        metadata: 'invalid-json',
      }]);

      const result = await dbService.getSession(session.id);
      
      expect(result?.metadata).toBeUndefined();
    });
  });

  describe('close', () => {
    it('should close the database connection', async () => {
      await dbService.close();
      
      expect(mockDb.close).toHaveBeenCalled();
    });
  });
});