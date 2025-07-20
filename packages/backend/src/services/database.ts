import * as duckdb from 'duckdb';
import { promisify } from 'util';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Session, Message, User } from '@voice-agent-mastra-demo/shared';

export class DatabaseService {
  private db: duckdb.Database;
  private connection: duckdb.Connection;
  private run: (sql: string, params?: unknown[]) => Promise<unknown>;
  private all: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  private get: (sql: string, params?: unknown[]) => Promise<unknown>;

  constructor() {
    this.db = new duckdb.Database(config.DATABASE_PATH);
    this.connection = new duckdb.Connection(this.db);
    
    // Promisify database methods
    this.run = promisify(this.connection.run.bind(this.connection));
    this.all = promisify(this.connection.all.bind(this.connection));
    // Use all() and take first result for get operations
    this.get = async (sql: string, params?: unknown[]) => {
      const results = await this.all(sql, params);
      return results.length > 0 ? results[0] : null;
    };
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing database...');
      
      // Create tables if they don't exist
      await this.createTables();
      
      // Create indexes for better performance
      await this.createIndexes();
      
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    // Sessions table
    await this.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status VARCHAR NOT NULL CHECK (status IN ('active', 'ended', 'paused')),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    await this.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR PRIMARY KEY,
        session_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        type VARCHAR NOT NULL CHECK (type IN ('user', 'agent')),
        confidence DECIMAL(3,2),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Users table
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        preferences JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createIndexes(): Promise<void> {
    // Indexes for better query performance
    await this.run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type)');
  }

  // Session operations
  async createSession(session: Session): Promise<void> {
    await this.run(`
      INSERT INTO sessions (id, user_id, start_time, status, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [session.id, session.userId, session.startTime.toISOString(), session.status, JSON.stringify(session.metadata || {})]);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const row = await this.get(`
      SELECT * FROM sessions WHERE id = ?
    `, [sessionId]) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.status) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.endTime) {
      setClauses.push('end_time = ?');
      values.push(updates.endTime.toISOString());
    }
    if (updates.metadata) {
      setClauses.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(sessionId);

    await this.run(`
      UPDATE sessions SET ${setClauses.join(', ')} WHERE id = ?
    `, values);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
  }

  async getActiveSessions(): Promise<Session[]> {
    const rows = await this.all(`
      SELECT * FROM sessions WHERE status = 'active' ORDER BY start_time DESC
    `);

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // Message operations
  async addMessage(message: Message): Promise<void> {
    const confidence = message.type === 'agent' ? (message as { confidence?: number }).confidence : null;
    const userId = message.type === 'user' ? (message as { userId: string }).userId : 'agent';
    
    await this.run(`
      INSERT INTO messages (id, session_id, user_id, content, timestamp, type, confidence, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      message.id,
      message.sessionId,
      userId,
      message.content,
      message.timestamp.toISOString(),
      message.type,
      confidence,
      JSON.stringify((message as { metadata?: Record<string, unknown> }).metadata || {})
    ]);
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const rows = await this.all(`
      SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC
    `, [sessionId]);

    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      content: row.content,
      timestamp: new Date(row.timestamp),
      type: row.type,
      ...(row.type === 'agent' && { confidence: row.confidence }),
      ...(row.metadata && { metadata: JSON.parse(row.metadata) }),
    }));
  }

  async getRecentMessages(limit: number = 100): Promise<Message[]> {
    const rows = await this.all(`
      SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?
    `, [limit]);

    return rows.map((row: any) => ({
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      content: row.content,
      timestamp: new Date(row.timestamp),
      type: row.type,
      ...(row.type === 'agent' && { confidence: row.confidence }),
      ...(row.metadata && { metadata: JSON.parse(row.metadata) }),
    }));
  }

  // User operations
  async createUser(user: User): Promise<void> {
    await this.run(`
      INSERT INTO users (id, name, email, preferences)
      VALUES (?, ?, ?, ?)
    `, [user.id, user.name, user.email, JSON.stringify(user.preferences)]);
  }

  async getUser(userId: string): Promise<User | null> {
    const row = await this.get(`
      SELECT * FROM users WHERE id = ?
    `, [userId]) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      preferences: JSON.parse(row.preferences),
    };
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.name) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.email) {
      setClauses.push('email = ?');
      values.push(updates.email);
    }
    if (updates.preferences) {
      setClauses.push('preferences = ?');
      values.push(JSON.stringify(updates.preferences));
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await this.run(`
      UPDATE users SET ${setClauses.join(', ')} WHERE id = ?
    `, values);
  }

  // Cleanup operations
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.run(`
      UPDATE sessions 
      SET status = 'ended', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' 
      AND start_time < datetime('now', '-30 minutes')
    `) as any;

    return result.changes || 0;
  }

  async getDatabaseStats(): Promise<{
    sessions: number;
    messages: number;
    users: number;
    activeSessions: number;
  }> {
    const [sessionsResult, messagesResult, usersResult, activeSessionsResult] = await Promise.all([
      this.get('SELECT COUNT(*) as count FROM sessions'),
      this.get('SELECT COUNT(*) as count FROM messages'),
      this.get('SELECT COUNT(*) as count FROM users'),
      this.get('SELECT COUNT(*) as count FROM sessions WHERE status = "active"'),
    ]) as [any, any, any, any];

    return {
      sessions: sessionsResult.count,
      messages: messagesResult.count,
      users: usersResult.count,
      activeSessions: activeSessionsResult.count,
    };
  }

  async close(): Promise<void> {
    try {
      await this.connection.close();
      await this.db.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

// Export singleton instance
export const database = new DatabaseService();