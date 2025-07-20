import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { AccessToken } from 'livekit-server-sdk';
import pino from 'pino';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { v4 as uuidv4 } from 'uuid';

import { 
  generateId, 
  createTimestamp,
  SessionError,
  AgentError,
  safeParseVoiceMessage,
  safeParseSession,
  DEFAULT_USER_PREFERENCES,
  SESSION_TIMEOUT_MS,
  MAX_MESSAGE_LENGTH,
} from '@voice-agent-mastra-demo/shared';

import type { 
  VoiceMessage, 
  AgentResponse, 
  Session, 
  Message
} from '@voice-agent-mastra-demo/shared';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: true,
      ignore: 'pid,hostname'
    }
  } : undefined
});

// Rate limiters
const generalLimiter = new RateLimiterMemory({
  points: 100, // Limit each IP to 100 requests per duration
  duration: 60, // Per 60 seconds
});

const tokenLimiter = new RateLimiterMemory({
  points: 5, // Limit token generation to 5 per minute per IP
  duration: 60,
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const LIVEKIT_WS_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// Validate required environment variables
if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  logger.error('Missing required environment variables: LIVEKIT_API_KEY, LIVEKIT_API_SECRET');
  process.exit(1);
}

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
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
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

// In-memory storage (replace with Redis/Database in production)
const sessions = new Map<string, Session>();
const messages = new Map<string, Message[]>();

// Utility functions
function createSession(userId: string): Session {
  const session: Session = {
    id: generateId(),
    userId,
    startTime: new Date(),
    status: 'active',
    metadata: {}
  };
  sessions.set(session.id, session);
  messages.set(session.id, []);
  return session;
}

async function generateLiveKitToken(roomName: string, participantName: string): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
    name: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.post('/api/sessions', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    await tokenLimiter.consume(clientIP);
    
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const session = createSession(userId);
    logger.info(`Created session ${session.id} for user ${userId}`);

    res.json({ session });
  } catch (rejRes) {
    logger.warn(`Token generation rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Rate limit exceeded for token generation' });
  }
});

app.get('/api/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionMessages = messages.get(sessionId) || [];
    res.json({ session, messages: sessionMessages });
  } catch (error) {
    logger.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

app.post('/api/livekit/token', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    await tokenLimiter.consume(clientIP);
    
    const { roomName, participantName } = req.body;
    
    if (!roomName || !participantName) {
      return res.status(400).json({ 
        error: 'roomName and participantName are required' 
      });
    }

    const token = await generateLiveKitToken(roomName, participantName);
    
    logger.info(`Generated LiveKit token for ${participantName} in room ${roomName}`);
    
    res.json({ 
      token,
      url: LIVEKIT_WS_URL,
      roomName,
      participantName
    });
  } catch (rejRes) {
    if (rejRes && typeof rejRes === 'object' && 'remainingPoints' in rejRes) {
      logger.warn(`LiveKit token rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ error: 'Rate limit exceeded for token generation' });
    } else {
      logger.error('Error generating LiveKit token:', rejRes);
      res.status(500).json({ error: 'Failed to generate token' });
    }
  }
});

app.post('/api/messages', (req, res) => {
  try {
    const result = safeParseVoiceMessage(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: 'Invalid message format',
        details: result.error.issues
      });
    }

    const voiceMessage = result.data;
    const sessionMessages = messages.get(voiceMessage.sessionId);
    
    if (!sessionMessages) {
      return res.status(404).json({ error: 'Session not found' });
    }

    sessionMessages.push(voiceMessage);
    
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
  
  socket.on('join_session', (sessionId: string) => {
    if (sessions.has(sessionId)) {
      socket.join(sessionId);
      logger.info(`Client ${socket.id} joined session ${sessionId}`);
      
      // Send existing messages
      const sessionMessages = messages.get(sessionId) || [];
      socket.emit('session_messages', sessionMessages);
    } else {
      socket.emit('error', { message: 'Session not found' });
    }
  });

  socket.on('voice_message', (data) => {
    const result = safeParseVoiceMessage(data);
    if (result.success) {
      const voiceMessage = result.data;
      const sessionMessages = messages.get(voiceMessage.sessionId);
      
      if (sessionMessages) {
        sessionMessages.push(voiceMessage);
        socket.to(voiceMessage.sessionId).emit('new_message', voiceMessage);
        logger.info(`Voice message processed for session ${voiceMessage.sessionId}`);
      }
    } else {
      socket.emit('error', { message: 'Invalid voice message format' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Starting graceful shutdown...');
  
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
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (session.status === 'active' && 
        (now - session.startTime.getTime()) > SESSION_TIMEOUT_MS) {
      session.status = 'ended';
      session.endTime = new Date();
      sessions.delete(sessionId);
      messages.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} expired sessions`);
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  logger.info(`🚀 Voice Agent Mastra Demo Backend running on port ${PORT}`);
  logger.info(`📡 LiveKit WebSocket URL: ${LIVEKIT_WS_URL}`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 