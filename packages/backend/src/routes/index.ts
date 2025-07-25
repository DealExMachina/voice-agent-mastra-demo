import { Router } from 'express';
import sessionsRouter from './sessions.js';
import messagesRouter from './messages.js';
import usersRouter from './users.js';
import analyticsRouter from './analytics.js';
import livekitRouter from './livekit.js';
import aiRouter from './ai.js';

const router: ReturnType<typeof Router> = Router();

// API version prefix
const API_VERSION = 'v1';
const API_PREFIX = `/api/${API_VERSION}`;

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Import the database service
    const { database } = await import('../services/database.js');
    
    // Check if database is initialized
    if (!database) {
      throw new Error('Database service not available');
    }
    
    // Simple health check first
    const health = await database.healthCheck();
    
    // Test basic query
    const testResult = await database.testQuery('SELECT COUNT(*) as count FROM sessions');
    
    // Test the exact query that's failing
    const activeSessionsTest = await database.testQuery('SELECT * FROM sessions WHERE status = \'active\'');
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      api: {
        version: API_VERSION,
        prefix: API_PREFIX,
      },
      database: {
        health,
        sessionsCount: testResult[0]?.count || 0,
        activeSessionsTest: activeSessionsTest.length,
      },
      endpoints: {
        sessions: `${API_PREFIX}/sessions`,
        messages: `${API_PREFIX}/messages`,
        users: `${API_PREFIX}/users`,
        analytics: `${API_PREFIX}/analytics`,
        livekit: `${API_PREFIX}/livekit`,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Voice Agent Mastra Demo API',
    version: '1.0.0',
    description: 'RESTful API for voice agent communication with Mastra, LiveKit, and SQLite',
    documentation: {
      health: `${API_PREFIX}/health`,
      sessions: {
        base: `${API_PREFIX}/sessions`,
        endpoints: [
          'GET / - List all sessions',
          'POST / - Create a new session',
          'GET /:sessionId - Get session details',
          'PUT /:sessionId - Update session',
          'DELETE /:sessionId - Delete session',
          'POST /:sessionId/end - End session',
          'POST /:sessionId/pause - Pause session',
          'POST /:sessionId/resume - Resume session',
        ],
      },
      messages: {
        base: `${API_PREFIX}/messages`,
        endpoints: [
          'GET / - List messages with filtering',
          'POST / - Create a new message',
          'GET /:messageId - Get message details',
          'GET /session/:sessionId - Get session messages',
          'GET /type/:type - Get messages by type',
          'GET /stats/overview - Get message statistics',
        ],
      },
      users: {
        base: `${API_PREFIX}/users`,
        endpoints: [
          'GET / - List all users',
          'POST / - Create a new user',
          'GET /:userId - Get user details',
          'PUT /:userId - Update user',
          'DELETE /:userId - Delete user',
          'GET /:userId/sessions - Get user sessions',
          'GET /:userId/messages - Get user messages',
          'PUT /:userId/preferences - Update user preferences',
          'GET /search/:email - Search user by email',
        ],
      },
      analytics: {
        base: `${API_PREFIX}/analytics`,
        endpoints: [
          'GET / - Get analytics data',
          'POST /events - Log analytics event',
          'GET /dashboard - Get dashboard statistics',
          'GET /events/:eventType - Get events by type',
          'GET /sessions/:sessionId - Get session analytics',
          'GET /users/:userId - Get user analytics',
          'GET /health - Get system health metrics',
        ],
      },
      livekit: {
        base: `${API_PREFIX}/livekit`,
        endpoints: [
          'POST /token - Generate LiveKit token',
          'POST /room/join - Join a room',
          'POST /room/leave - Leave a room',
          'GET /room/:roomName - Get room information',
          'GET /config - Get LiveKit configuration',
          'POST /webhook - Handle LiveKit webhooks',
          'GET /analytics - Get LiveKit analytics',
        ],
      },
      ai: {
        base: `${API_PREFIX}/ai`,
        endpoints: [
          'GET /status - Get AI services status',
          'POST /process-message - Process message with AI',
          'POST /process-conversation - Process conversation with AI',
          'POST /search-memories - Search for memories',
          'GET /memories/user/:userId - Get user memories',
          'GET /memories/session/:sessionId - Get session memories',
          'GET /memories/stats/:userId - Get memory statistics',
          'POST /entities/extract - Extract entities from text',
          'GET /entities/types - Get supported entity types',
        ],
      },
    },
    features: [
      'Real-time voice communication with LiveKit',
      'Session management with SQLite persistence',
      'Message history and analytics',
      'User management and preferences',
      'Comprehensive analytics and monitoring',
      'WebSocket support for real-time updates',
      'Rate limiting and security',
      'AI-powered entity extraction with Mastra',
      'Memory management with MEM0',
      'Intelligent conversation processing',
    ],
    technologies: [
      'Express.js',
      'SQLite',
      'LiveKit',
      'Socket.IO',
      'Zod validation',
      'TypeScript',
      'Mastra AI',
      'MEM0',
    ],
  });
});

// Mount route modules
router.use('/sessions', sessionsRouter);
router.use('/messages', messagesRouter);
router.use('/users', usersRouter);
router.use('/analytics', analyticsRouter);
router.use('/livekit', livekitRouter);
router.use('/ai', aiRouter);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/health',
      '/sessions',
      '/messages',
      '/users',
      '/analytics',
      '/livekit',
      '/ai',
    ],
  });
});

export default router;