import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import type { Session, Message } from '@voice-agent-mastra-demo/shared';

interface DatabaseConfig {
  path: string;
  readonly: boolean;
  fileMustExist: boolean;
  timeout: number;
  verbose?: (message?: unknown, ...optionalParams: unknown[]) => void;
}



export class DatabaseService {
  private db: Database.Database;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(dbConfig?: Partial<DatabaseConfig>) {
    this.config = {
      path: dbConfig?.path || './data/voice-agent.db',
      readonly: dbConfig?.readonly || false,
      fileMustExist: dbConfig?.fileMustExist || false,
      timeout: dbConfig?.timeout || 5000,
      verbose: dbConfig?.verbose,
    };

    // Initialize SQLite database
    this.db = new Database(this.config.path, {
      readonly: this.config.readonly,
      fileMustExist: this.config.fileMustExist,
      timeout: this.config.timeout,
      verbose: this.config.verbose,
    });

    // Configure SQLite settings for performance and safety
    this.configureDatabase();
  }

  private configureDatabase(): void {
    try {
      // Enable WAL mode for better concurrency
      this.db.exec('PRAGMA journal_mode = WAL;');
      
      // Set synchronous mode for performance
      this.db.exec('PRAGMA synchronous = NORMAL;');
      
      // Set cache size (negative value means KB)
      this.db.exec('PRAGMA cache_size = -64000;'); // 64MB cache
      
      // Enable foreign key constraints
      this.db.exec('PRAGMA foreign_keys = ON;');
      
      // Set busy timeout
      this.db.exec('PRAGMA busy_timeout = 30000;'); // 30 seconds

      logger.info('Database configured successfully');
    } catch (error) {
      logger.error('Failed to configure database:', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Database already initialized');
      return;
    }

    try {
      logger.info('Initializing database...');
      
      // Create tables if they don't exist
      this.createTables();
      
      // Create indexes for better performance
      this.createIndexes();
      
      this.isInitialized = true;
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables(): void {
    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        start_time TEXT DEFAULT (datetime('now')),
        end_time TEXT,
        status TEXT DEFAULT 'active',
        conversation_state TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now')),
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        preferences TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Analytics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        session_id TEXT,
        user_id TEXT,
        metadata TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Conversation summaries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_summaries (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        key_points TEXT,
        entities TEXT,
        sentiment TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Transcription messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcription_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now')),
        is_final BOOLEAN DEFAULT FALSE,
        confidence REAL DEFAULT 0.0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Entities table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        metadata TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        message_id TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    logger.info('Database tables created successfully');
  }

  private createIndexes(): void {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)',
      'CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_entities_session_id ON entities(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)',
    ];

    indexes.forEach(indexSql => {
      try {
        this.db.exec(indexSql);
      } catch (error) {
        logger.warn('Failed to create index:', { indexSql, error });
      }
    });

    logger.info('Database indexes created successfully');
  }

  // Session operations
  async createSession(session: Session): Promise<Session> {
    const startTime = Date.now();
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, user_id, start_time, status, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        session.id,
        session.userId,
        session.startTime.toISOString(),
        session.status,
        JSON.stringify(session.metadata || {})
      );

      // Log analytics event
      const { generateId } = await import('@voice-agent-mastra-demo/shared');
      const analyticsStmt = this.db.prepare(`
        INSERT INTO analytics (id, event_type, session_id, user_id, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      analyticsStmt.run(
        generateId(),
        'session_created',
        session.id,
        session.userId,
        JSON.stringify({ status: session.status })
      );

      const executionTime = Date.now() - startTime;
      logger.info(`Created session ${session.id} in ${executionTime}ms`);
      
      return session;
    } catch (error) {
      logger.error('Error creating session:', { 
        sessionId: session.id, 
        error: error instanceof Error ? error.message : error 
      });
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
      const row = stmt.get(sessionId) as any;

      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        status: row.status,
        conversationState: row.conversation_state ? JSON.parse(row.conversation_state) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };
    } catch (error) {
      logger.error('Error getting session:', { sessionId, error });
      throw new Error(`Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    try {
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
      if (updates.conversationState) {
        setClauses.push('conversation_state = ?');
        values.push(JSON.stringify(updates.conversationState));
      }

      setClauses.push('updated_at = datetime(\'now\')');
      values.push(sessionId);

      const stmt = this.db.prepare(`
        UPDATE sessions SET ${setClauses.join(', ')} WHERE id = ?
      `);
      
      stmt.run(...values);
      
      logger.info(`Updated session ${sessionId}`);
    } catch (error) {
      logger.error('Error updating session:', { sessionId, error });
      throw new Error(`Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSessionConversationState(sessionId: string, conversationState: any): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE sessions SET conversation_state = ?, updated_at = datetime('now') WHERE id = ?
      `);
      
      stmt.run(JSON.stringify(conversationState), sessionId);
    } catch (error) {
      logger.error('Error updating session conversation state:', { sessionId, error });
      throw error;
    }
  }

  // Message operations
  async addMessage(message: Message): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO messages (id, session_id, user_id, content, timestamp, type, confidence, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
             const userId = message.type === 'user' ? (message as any).userId : 'agent';
       
       stmt.run(
        message.id,
        message.sessionId,
        userId,
        message.content,
        message.timestamp.toISOString(),
        message.type,
        message.type === 'agent' ? (message as any).confidence || 1.0 : 1.0,
        JSON.stringify((message as any).metadata || {})
      );

      // Log analytics event
      const { generateId } = await import('@voice-agent-mastra-demo/shared');
      const analyticsStmt = this.db.prepare(`
        INSERT INTO analytics (id, event_type, session_id, user_id, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
             analyticsStmt.run(
        generateId(),
        'message_added',
        message.sessionId,
        userId,
        JSON.stringify({ type: message.type })
      );

      logger.info(`Added message ${message.id} to session ${message.sessionId}`);
    } catch (error) {
      logger.error('Error adding message:', { messageId: message.id, error });
      throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC
      `);
      
      const rows = stmt.all(sessionId) as any[];

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
    } catch (error) {
      logger.error('Error getting session messages:', { sessionId, error });
      throw new Error(`Failed to get session messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Transcription operations
  async storeTranscriptionMessage(transcription: any): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO transcription_messages (id, session_id, content, timestamp, is_final, confidence)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        transcription.id,
        transcription.sessionId,
        transcription.content,
        transcription.timestamp.toISOString(),
        transcription.isFinal,
        transcription.confidence
      );
    } catch (error) {
      logger.error('Error storing transcription message:', error);
      throw error;
    }
  }

  // Summary operations
  async storeConversationSummary(summary: any): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO conversation_summaries (id, session_id, summary, key_points, entities, sentiment, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        summary.id,
        summary.sessionId,
        summary.summary,
        JSON.stringify(summary.keyPoints),
        JSON.stringify(summary.entities),
        summary.sentiment,
        summary.timestamp.toISOString()
      );
    } catch (error) {
      logger.error('Error storing conversation summary:', error);
      throw error;
    }
  }

  async getConversationSummary(sessionId: string): Promise<any | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM conversation_summaries WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1
      `);
      
      const row = stmt.get(sessionId) as any;
      
      if (!row) return null;
      
      return {
        id: row.id,
        sessionId: row.session_id,
        summary: row.summary,
        keyPoints: JSON.parse(row.key_points || '[]'),
        entities: JSON.parse(row.entities || '[]'),
        sentiment: row.sentiment,
        timestamp: new Date(row.timestamp),
      };
    } catch (error) {
      logger.error('Error getting conversation summary:', error);
      throw error;
    }
  }

  // Database stats
  async getDatabaseStats(): Promise<{
    sessions: number;
    messages: number;
    users: number;
    activeSessions: number;
    totalAnalytics: number;
    databaseSize: string;
  }> {
    try {
      const sessionsStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions');
      const messagesStmt = this.db.prepare('SELECT COUNT(*) as count FROM messages');
      const usersStmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
      const activeSessionsStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE status = ?');
      const analyticsStmt = this.db.prepare('SELECT COUNT(*) as count FROM analytics');

      const sessionsResult = sessionsStmt.get() as any;
      const messagesResult = messagesStmt.get() as any;
      const usersResult = usersStmt.get() as any;
      const activeSessionsResult = activeSessionsStmt.get('active') as any;
      const analyticsResult = analyticsStmt.get() as any;

      return {
        sessions: sessionsResult?.count || 0,
        messages: messagesResult?.count || 0,
        users: usersResult?.count || 0,
        activeSessions: activeSessionsResult?.count || 0,
        totalAnalytics: analyticsResult?.count || 0,
        databaseSize: this.formatBytes(0), // SQLite doesn't easily provide size info
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      return {
        sessions: 0,
        messages: 0,
        users: 0,
        activeSessions: 0,
        totalAnalytics: 0,
        databaseSize: '0 Bytes',
      };
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      const startTime = Date.now();
      const stmt = this.db.prepare('SELECT 1 as health_check');
      stmt.get();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        details: `Database responding in ${responseTime}ms`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Cleanup operations
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      
      const stmt = this.db.prepare(`
        DELETE FROM sessions 
        WHERE status = 'active' 
        AND start_time < ? 
        AND updated_at < ?
      `);
      
      const result = stmt.run(expiredTime, expiredTime);
      return result.changes || 0;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  async close(): Promise<void> {
    try {
      this.db.close();
      this.isInitialized = false;
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  // Store entities
  async storeEntities(sessionId: string, entities: import('@voice-agent-mastra-demo/shared').Entity[]): Promise<void> {
    if (!entities.length) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO entities (id, session_id, type, value, confidence, metadata, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const entity of entities) {
        stmt.run(
          entity.id,
          sessionId,
          entity.type,
          entity.value,
          entity.confidence,
          JSON.stringify(entity.metadata ?? {}),
          new Date().toISOString()
        );
      }

      logger.info(`Stored ${entities.length} entities for session ${sessionId}`);
    } catch (error) {
      logger.error('Error storing entities:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const database = new DatabaseService();