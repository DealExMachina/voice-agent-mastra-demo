import duckdb from 'duckdb';
import { promisify } from 'util';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Session, Message, User } from '@voice-agent-mastra-demo/shared';

interface DatabaseConfig {
  path: string;
  maxConnections: number;
  enableWAL: boolean;
  enableCompression: boolean;
  memoryLimit: string;
  tempDirectory?: string;
}

interface QueryResult<T = any> {
  data: T[];
  rowCount: number;
  executionTime: number;
}

export class DatabaseService {
  private db: duckdb.Database;
  private connectionPool: duckdb.Connection[] = [];
  private currentConnectionIndex = 0;
  private config: DatabaseConfig;
  private isInitialized = false;
  private preparedStatements = new Map<string, duckdb.Statement>();

  constructor(dbConfig?: Partial<DatabaseConfig>) {
    this.config = {
      path: dbConfig?.path || ':memory:',
      maxConnections: dbConfig?.maxConnections || 5,
      enableWAL: dbConfig?.enableWAL || true,
      enableCompression: dbConfig?.enableCompression || true,
      memoryLimit: dbConfig?.memoryLimit || '1GB',
      tempDirectory: dbConfig?.tempDirectory,
    };

    // Initialize database with configuration
    this.db = new duckdb.Database(this.config.path);
    
    // Configure database settings
    this.configureDatabase();
    
    // Initialize connection pool
    this.initializeConnectionPool();
  }

  private configureDatabase(): void {
    try {
      // Enable WAL mode for better concurrency
      if (this.config.enableWAL) {
        this.db.exec('PRAGMA journal_mode=WAL');
      }

      // Set memory limit
      this.db.exec(`PRAGMA memory_limit='${this.config.memoryLimit}'`);

      // Enable compression
      if (this.config.enableCompression) {
        this.db.exec('PRAGMA compression=zstd');
      }

      // Set temp directory if specified
      if (this.config.tempDirectory) {
        this.db.exec(`PRAGMA temp_directory='${this.config.tempDirectory}'`);
      }

      // Optimize for performance
      this.db.exec('PRAGMA synchronous=NORMAL');
      this.db.exec('PRAGMA cache_size=10000');
      this.db.exec('PRAGMA page_size=4096');

      logger.info('Database configured successfully');
    } catch (error) {
      logger.error('Failed to configure database:', error);
      throw error;
    }
  }

  private initializeConnectionPool(): void {
    try {
      for (let i = 0; i < this.config.maxConnections; i++) {
        const connection = new duckdb.Connection(this.db);
        this.connectionPool.push(connection);
      }
      logger.info(`Connection pool initialized with ${this.config.maxConnections} connections`);
    } catch (error) {
      logger.error('Failed to initialize connection pool:', error);
      throw error;
    }
  }

  private getConnection(): duckdb.Connection {
    const connection = this.connectionPool[this.currentConnectionIndex];
    this.currentConnectionIndex = (this.currentConnectionIndex + 1) % this.config.maxConnections;
    return connection;
  }

  private async executeQuery<T = any>(
    sql: string, 
    params: unknown[] = [], 
    connection?: duckdb.Connection
  ): Promise<QueryResult<T>> {
    const conn = connection || this.getConnection();
    const startTime = Date.now();

    try {
      const all = promisify(conn.all.bind(conn));
      const data = await all(sql) as T[];
      const executionTime = Date.now() - startTime;

      return {
        data,
        rowCount: data.length,
        executionTime,
      };
    } catch (error) {
      logger.error('Query execution failed:', { sql, params, error });
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeStatement(
    sql: string, 
    params: unknown[] = [], 
    connection?: duckdb.Connection
  ): Promise<{ changes: number; executionTime: number }> {
    const conn = connection || this.getConnection();
    const startTime = Date.now();

    try {
      const run = promisify(conn.run.bind(conn));
      const result = await run(sql) as any;
      const executionTime = Date.now() - startTime;

      return {
        changes: result?.changes || 0,
        executionTime,
      };
    } catch (error) {
      logger.error('Statement execution failed:', { sql, params, error });
      throw new Error(`Database statement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeTransaction<T>(
    operations: (connection: duckdb.Connection) => Promise<T>
  ): Promise<T> {
    const connection = this.getConnection();
    
    try {
      // Start transaction
      await promisify(connection.run.bind(connection))('BEGIN TRANSACTION');
      
      // Execute operations
      const result = await operations(connection);
      
      // Commit transaction
      await promisify(connection.run.bind(connection))('COMMIT');
      
      return result;
    } catch (error) {
      // Rollback on error
      try {
        await promisify(connection.run.bind(connection))('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Failed to rollback transaction:', rollbackError);
      }
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
      await this.createTables();
      
      // Create indexes for better performance
      await this.createIndexes();
      
      // Create prepared statements
      await this.prepareStatements();
      
      this.isInitialized = true;
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const tables = [
      // Sessions table with improved schema
      `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status VARCHAR NOT NULL CHECK (status IN ('active', 'ended', 'paused')),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Messages table with improved schema
      `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR PRIMARY KEY,
        session_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        type VARCHAR NOT NULL CHECK (type IN ('user', 'agent')),
        confidence DECIMAL(3,2),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`,

      // Users table with improved schema
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        preferences JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Analytics table for performance monitoring
      `CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY,
        event_type VARCHAR NOT NULL,
        session_id VARCHAR,
        user_id VARCHAR,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSql of tables) {
      await this.executeStatement(tableSql);
    }

    // Create sequence for analytics ID if it doesn't exist
    try {
      await this.executeStatement('CREATE SEQUENCE IF NOT EXISTS analytics_id_seq');
    } catch (error) {
      logger.warn('Failed to create analytics sequence:', error);
    }
  }

  private async createIndexes(): Promise<void> {
    // Additional indexes for better query performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON sessions(user_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_messages_session_timestamp ON messages(session_id, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_messages_type_timestamp ON messages(type, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_session_event ON analytics(session_id, event_type)',
    ];

    for (const indexSql of indexes) {
      try {
        await this.executeStatement(indexSql);
      } catch (error) {
        // Ignore index creation errors for now
        logger.warn(`Failed to create index: ${indexSql}`, error);
      }
    }
  }

  private async prepareStatements(): Promise<void> {
    // For now, skip prepared statements to avoid conflicts
    // TODO: Implement proper prepared statement management
    logger.info('Prepared statements disabled for now');
  }

  // Enhanced Session operations
  async createSession(session: Session): Promise<Session> {
    return this.executeTransaction(async (connection) => {
      await this.executeStatement(
        `INSERT INTO sessions (id, user_id, start_time, status, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [
          session.id,
          session.userId,
          session.startTime.toISOString(),
          session.status,
          JSON.stringify(session.metadata || {})
        ],
        connection
      );

      // Log analytics event
      await this.executeStatement(
        'INSERT INTO analytics (id, event_type, session_id, user_id, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?, ?, ?)',
        ['session_created', session.id, session.userId, JSON.stringify({ status: session.status })],
        connection
      );

      return session;
    });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.executeQuery(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId]
    );

    if (result.data.length === 0) return null;

    const row = result.data[0] as any;
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

    await this.executeStatement(
      `UPDATE sessions SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    // Log analytics event
    await this.executeStatement(
      'INSERT INTO analytics (id, event_type, session_id, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?, ?)',
      ['session_updated', sessionId, JSON.stringify(updates)]
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.executeTransaction(async (connection) => {
      // Log analytics event before deletion
      await this.executeStatement(
        'INSERT INTO analytics (id, event_type, session_id, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?, ?)',
        ['session_deleted', sessionId, JSON.stringify({ deleted_at: new Date().toISOString() })],
        connection
      );

      await this.executeStatement(
        'DELETE FROM sessions WHERE id = ?',
        [sessionId],
        connection
      );
    });
  }

  async getActiveSessions(): Promise<Session[]> {
    const result = await this.executeQuery(
      'SELECT * FROM sessions WHERE status = \'active\' ORDER BY start_time DESC'
    );

    return result.data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  async getSessionsByUserId(userId: string): Promise<Session[]> {
    const result = await this.executeQuery(
      `SELECT * FROM sessions WHERE user_id = '${userId}' ORDER BY start_time DESC`
    );

    return result.data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // Enhanced Message operations
  async addMessage(message: Message): Promise<Message> {
    return this.executeTransaction(async (connection) => {
      const confidence = message.type === 'agent' ? (message as { confidence?: number }).confidence : null;
      const userId = message.type === 'user' ? (message as { userId: string }).userId : 'agent';
      
      await this.executeStatement(
        `INSERT INTO messages (id, session_id, user_id, content, timestamp, type, confidence, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.sessionId,
          userId,
          message.content,
          message.timestamp.toISOString(),
          message.type,
          confidence,
          JSON.stringify((message as { metadata?: Record<string, unknown> }).metadata || {})
        ],
        connection
      );

      // Log analytics event
      await this.executeStatement(
        'INSERT INTO analytics (id, event_type, session_id, user_id, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?, ?, ?)',
        ['message_created', message.sessionId, userId, JSON.stringify({ type: message.type, content_length: message.content.length })],
        connection
      );

      return message;
    });
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const result = await this.executeQuery(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    );

    return result.data.map((row: any) => ({
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
    const result = await this.executeQuery(
      'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );

    return result.data.map((row: any) => ({
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

  async getMessagesByType(type: 'user' | 'agent', limit: number = 100): Promise<Message[]> {
    const result = await this.executeQuery(
      'SELECT * FROM messages WHERE type = ? ORDER BY timestamp DESC LIMIT ?',
      [type, limit]
    );

    return result.data.map((row: any) => ({
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

  // Enhanced User operations
  async createUser(user: User): Promise<User> {
    return this.executeTransaction(async (connection) => {
      await this.executeStatement(
        `INSERT INTO users (id, name, email, preferences)
         VALUES (?, ?, ?, ?)`,
        [user.id, user.name, user.email, JSON.stringify(user.preferences)],
        connection
      );

      // Log analytics event
      await this.executeStatement(
        'INSERT INTO analytics (id, event_type, user_id, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?, ?)',
        ['user_created', user.id, JSON.stringify({ email: user.email })],
        connection
      );

      return user;
    });
  }

  async getUser(userId: string): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (result.data.length === 0) return null;

    const row = result.data[0] as any;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      preferences: JSON.parse(row.preferences),
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (result.data.length === 0) return null;

    const row = result.data[0] as any;
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

    await this.executeStatement(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    // Log analytics event
    await this.executeStatement(
      'INSERT INTO analytics (id, event_type, user_id, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?, ?)',
      ['user_updated', userId, JSON.stringify(updates)]
    );
  }

  // Analytics operations
  async logEvent(eventType: string, sessionId?: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.executeStatement(
      'INSERT INTO analytics (id, event_type, session_id, user_id, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?, ?, ?)',
      [eventType, sessionId, userId, JSON.stringify(metadata || {})]
    );
  }

  async getAnalytics(limit: number = 100): Promise<any[]> {
    const result = await this.executeQuery(
      'SELECT * FROM analytics ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    return result.data.map((row: any) => ({
      id: row.id,
      eventType: row.event_type,
      sessionId: row.session_id,
      userId: row.user_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: new Date(row.created_at),
    }));
  }

  // Cleanup operations
  async cleanupExpiredSessions(): Promise<number> {
    return this.executeTransaction(async (connection) => {
      // Log cleanup event
      await this.executeStatement(
        'INSERT INTO analytics (id, event_type, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?)',
        ['cleanup_started', JSON.stringify({ timestamp: new Date().toISOString() })],
        connection
      );

      const result = await this.executeStatement(
        `UPDATE sessions 
         SET status = 'ended', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE status = 'active' 
         AND start_time < datetime('now', '-30 minutes')`,
        [],
        connection
      );

      // Log cleanup completion
      await this.executeStatement(
        'INSERT INTO analytics (id, event_type, metadata) VALUES (nextval(\'analytics_id_seq\'), ?, ?)',
        ['cleanup_completed', JSON.stringify({ sessions_ended: result.changes })],
        connection
      );

      return result.changes;
    });
  }

  async getDatabaseStats(): Promise<{
    sessions: number;
    messages: number;
    users: number;
    activeSessions: number;
    totalAnalytics: number;
    databaseSize: string;
  }> {
    const [sessionsResult, messagesResult, usersResult, activeSessionsResult, analyticsResult] = await Promise.all([
      this.executeQuery('SELECT COUNT(*) as count FROM sessions'),
      this.executeQuery('SELECT COUNT(*) as count FROM messages'),
      this.executeQuery('SELECT COUNT(*) as count FROM users'),
      this.executeQuery('SELECT COUNT(*) as count FROM sessions WHERE status = ?', ['active']),
      this.executeQuery('SELECT COUNT(*) as count FROM analytics'),
    ]);

    // Get database size (approximate) - DuckDB doesn't have pg_column_size
    // For now, return a placeholder since DuckDB doesn't provide easy table size info
    const sizeResult = { data: [{ total_size: 0 }] };

    return {
      sessions: sessionsResult.data[0]?.count || 0,
      messages: messagesResult.data[0]?.count || 0,
      users: usersResult.data[0]?.count || 0,
      activeSessions: activeSessionsResult.data[0]?.count || 0,
      totalAnalytics: analyticsResult.data[0]?.count || 0,
      databaseSize: this.formatBytes(sizeResult.data[0]?.total_size || 0),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async close(): Promise<void> {
    try {
      // Close prepared statements
      for (const statement of this.preparedStatements.values()) {
        statement.finalize();
      }
      this.preparedStatements.clear();

      // Close connection pool
      for (const connection of this.connectionPool) {
        await promisify(connection.close.bind(connection))();
      }
      this.connectionPool = [];

      // Close database
      await promisify(this.db.close.bind(this.db))();
      
      this.isInitialized = false;
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      const startTime = Date.now();
      await this.executeQuery('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        details: `Database responding in ${responseTime}ms with ${this.connectionPool.length} active connections`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Public method for testing queries
  async testQuery(sql: string, params: unknown[] = []): Promise<any> {
    return this.executeQuery(sql, params);
  }
}

// Export singleton instance
export const database = new DatabaseService();