import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { promises as fs } from 'fs';
import path from 'path';

import { 
  generateId, 
  safeParseVoiceMessage,
} from '@voice-agent-mastra-demo/shared';

import type { 
  Session
} from '@voice-agent-mastra-demo/shared';

import { config, getRateLimitConfig } from './config/env.js';
import { logger } from './utils/logger.js';
import { database } from './services/database.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Ensure data directory exists
const dataDir = path.dirname(config.DATABASE_PATH);
await fs.mkdir(dataDir, { recursive: true });

// Initialize database
await database.initialize();

// Rate limiters
const rateLimitConfig = getRateLimitConfig();
const generalLimiter = new RateLimiterMemory({
  points: rateLimitConfig.general.points,
  duration: rateLimitConfig.general.duration,
});

const tokenLimiter = new RateLimiterMemory({
  points: rateLimitConfig.token.points,
  duration: rateLimitConfig.token.duration,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    await generalLimiter.consume(clientIP);
    next();
  } catch (rejRes) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too Many Requests' });
  }
});

// Mount API routes
app.use('/api/v1', apiRouter);

// Legacy endpoints for backward compatibility
app.get('/health', async (req, res) => {
  try {
    const stats = await database.getDatabaseStats();
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.NODE_ENV,
      database: stats
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// Legacy session endpoint for backward compatibility
app.post('/api/sessions', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const session: Session = {
      id: generateId(),
      userId,
      startTime: new Date(),
      status: 'active',
      metadata: {},
    };

    const createdSession = await database.createSession(session);
    
    logger.info(`Created legacy session ${session.id} for user ${userId}`);
    res.status(201).json({ session: createdSession });
  } catch (error) {
    logger.error('Error creating legacy session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Legacy message endpoint for Socket.IO compatibility
app.post('/api/messages', async (req, res) => {
  try {
    const result = safeParseVoiceMessage(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid message format',
        details: result.error.issues
      });
    }

    const voiceMessage = result.data;
    
    // Verify session exists
    const session = await database.getSession(voiceMessage.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Store message in database
    await database.addMessage(voiceMessage);
    
    // Emit to connected clients
    io.to(voiceMessage.sessionId).emit('new_message', voiceMessage);
    
    logger.info(`Added message to session ${voiceMessage.sessionId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join_session', async (sessionId: string) => {
    try {
      const session = await database.getSession(sessionId);
      if (session) {
        socket.join(sessionId);
        logger.info(`Client ${socket.id} joined session ${sessionId}`);
        
        // Send existing messages
        const sessionMessages = await database.getSessionMessages(sessionId);
        socket.emit('session_messages', sessionMessages);
      } else {
        socket.emit('error', { message: 'Session not found' });
      }
    } catch (error) {
      logger.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  socket.on('voice_message', async (data) => {
    try {
      const result = safeParseVoiceMessage(data);
      if (result.success) {
        const voiceMessage = result.data;
        
        // Verify session exists
        const session = await database.getSession(voiceMessage.sessionId);
        if (session) {
          // Store message in database
          await database.addMessage(voiceMessage);
          socket.to(voiceMessage.sessionId).emit('new_message', voiceMessage);
          logger.info(`Voice message processed for session ${voiceMessage.sessionId}`);
        } else {
          socket.emit('error', { message: 'Session not found' });
        }
      } else {
        socket.emit('error', { message: 'Invalid voice message format' });
      }
    } catch (error) {
      logger.error('Error processing voice message:', error);
      socket.emit('error', { message: 'Failed to process voice message' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use(notFoundHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown...');
  
  try {
    // Close database connection
    await database.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database:', error);
  }
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Session cleanup interval (every 5 minutes)
setInterval(async () => {
  try {
    const cleanedCount = await database.cleanupExpiredSessions();
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired sessions`);
    }
  } catch (error) {
    logger.error('Error during session cleanup:', error);
  }
}, 5 * 60 * 1000);

server.listen(config.PORT, () => {
  logger.info(`🚀 Voice Agent Mastra Demo Backend running on port ${config.PORT}`);
  logger.info(`📡 API Documentation: http://localhost:${config.PORT}/api/v1`);
  logger.info(`🌐 Environment: ${config.NODE_ENV}`);
  logger.info(`🗄️ Database: ${config.DATABASE_PATH}`);
  logger.info(`📊 Health Check: http://localhost:${config.PORT}/health`);
}); 