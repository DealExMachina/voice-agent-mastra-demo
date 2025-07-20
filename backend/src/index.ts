import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { AccessToken } from 'livekit-server-sdk';

import { VoiceMessage, AgentResponse, Session, generateId } from '@voice-agent-mastra-demo/shared';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// In-memory storage (replace with database in production)
const sessions = new Map<string, Session>();
const voiceMessages = new Map<string, VoiceMessage[]>();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/sessions', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const session: Session = {
    id: generateId(),
    userId,
    startTime: new Date(),
    status: 'active'
  };

  sessions.set(session.id, session);
  voiceMessages.set(session.id, []);

  res.json(session);
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

app.post('/api/sessions/:sessionId/messages', (req, res) => {
  const { sessionId } = req.params;
  const { content, userId } = req.body;

  if (!content || !userId) {
    return res.status(400).json({ error: 'content and userId are required' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const message: VoiceMessage = {
    id: generateId(),
    content,
    timestamp: new Date(),
    userId,
    sessionId
  };

  const messages = voiceMessages.get(sessionId) || [];
  messages.push(message);
  voiceMessages.set(sessionId, messages);

  // Emit to connected clients
  io.to(sessionId).emit('voice-message', message);

  // TODO: Process with Mastra and mem0
  // For now, send a mock response
  setTimeout(() => {
    const response: AgentResponse = {
      id: generateId(),
      content: `I received your message: "${content}". This is a mock response from the voice agent.`,
      timestamp: new Date(),
      sessionId,
      confidence: 0.95
    };

    const messages = voiceMessages.get(sessionId) || [];
    messages.push(response as any);
    voiceMessages.set(sessionId, messages);

    io.to(sessionId).emit('agent-response', response);
  }, 1000);

  res.json(message);
});

// LiveKit token generation
app.post('/api/livekit/token', (req, res) => {
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'roomName and participantName are required' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit credentials not configured' });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });

  at.addGrant({ roomJoin: true, room: roomName });

  const token = at.toJwt();

  res.json({ token });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-session', (sessionId: string) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
  });

  socket.on('leave-session', (sessionId: string) => {
    socket.leave(sessionId);
    console.log(`Client ${socket.id} left session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app; 