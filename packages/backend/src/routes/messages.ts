import { Router } from 'express';
import { z } from 'zod';
import { database } from '../services/database.js';
import { logger } from '../utils/logger.js';
import { generateId, safeParseVoiceMessage, safeParseAgentResponse } from '@voice-agent-mastra-demo/shared';
import type { Message, VoiceMessage, AgentResponse } from '@voice-agent-mastra-demo/shared';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const CreateVoiceMessageSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  userId: z.string().min(1, 'User ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const CreateAgentResponseSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const GetMessagesQuerySchema = z.object({
  sessionId: z.string().optional(),
  type: z.enum(['user', 'agent']).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// GET /api/messages - Get messages with filtering
router.get('/', async (req, res) => {
  try {
    const queryResult = GetMessagesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.issues,
      });
    }

    const { sessionId, type, limit = 50, offset = 0, startDate, endDate } = queryResult.data;

    let messages: Message[];

    if (sessionId) {
      messages = await database.getSessionMessages(sessionId);
    } else if (type) {
      messages = await database.getMessagesByType(type, limit);
    } else {
      messages = await database.getRecentMessages(limit);
    }

    // Apply date filtering if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      messages = messages.filter(message => {
        const messageDate = new Date(message.timestamp);
        return messageDate >= start && messageDate <= end;
      });
    }

    // Apply pagination
    const paginatedMessages = messages.slice(offset, offset + limit);

    // Group messages by type for statistics
    const stats = {
      total: messages.length,
      user: messages.filter(m => m.type === 'user').length,
      agent: messages.filter(m => m.type === 'agent').length,
      averageConfidence: messages
        .filter(m => m.type === 'agent')
        .reduce((sum, m) => sum + (m as AgentResponse).confidence, 0) / 
        Math.max(messages.filter(m => m.type === 'agent').length, 1),
    };

    res.json({
      messages: paginatedMessages,
      stats,
      pagination: {
        total: messages.length,
        limit,
        offset,
        hasMore: offset + limit < messages.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Create a new message
router.post('/', async (req, res) => {
  try {
    // Try to parse as voice message first
    const voiceMessageResult = safeParseVoiceMessage(req.body);
    if (voiceMessageResult.success) {
      const voiceMessage = voiceMessageResult.data;
      
      // Verify session exists
      const session = await database.getSession(voiceMessage.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const createdMessage = await database.addMessage(voiceMessage);
      
      logger.info(`Added voice message to session ${voiceMessage.sessionId}`);
      
      res.status(201).json({
        message: createdMessage,
        type: 'voice',
        success: 'Voice message created successfully',
      });
      return;
    }

    // Try to parse as agent response
    const agentResponseResult = safeParseAgentResponse(req.body);
    if (agentResponseResult.success) {
      const agentResponse = agentResponseResult.data;
      
      // Verify session exists
      const session = await database.getSession(agentResponse.sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const createdMessage = await database.addMessage(agentResponse);
      
      logger.info(`Added agent response to session ${agentResponse.sessionId}`);
      
      res.status(201).json({
        message: createdMessage,
        type: 'agent',
        success: 'Agent response created successfully',
      });
      return;
    }

    // If neither, try manual creation
    const createVoiceResult = CreateVoiceMessageSchema.safeParse(req.body);
    if (createVoiceResult.success) {
      const { content, userId, sessionId, timestamp, metadata } = createVoiceResult.data;
      
      // Verify session exists
      const session = await database.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const voiceMessage: VoiceMessage = {
        id: generateId(),
        content,
        userId,
        sessionId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        type: 'user',
        ...(metadata && { metadata }),
      };

      const createdMessage = await database.addMessage(voiceMessage);
      
      logger.info(`Added voice message to session ${sessionId}`);
      
      res.status(201).json({
        message: createdMessage,
        type: 'voice',
        success: 'Voice message created successfully',
      });
      return;
    }

    const createAgentResult = CreateAgentResponseSchema.safeParse(req.body);
    if (createAgentResult.success) {
      const { content, sessionId, confidence, timestamp, metadata } = createAgentResult.data;
      
      // Verify session exists
      const session = await database.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const agentResponse: AgentResponse = {
        id: generateId(),
        content,
        sessionId,
        confidence,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        type: 'agent',
        ...(metadata && { metadata }),
      };

      const createdMessage = await database.addMessage(agentResponse);
      
      logger.info(`Added agent response to session ${sessionId}`);
      
      res.status(201).json({
        message: createdMessage,
        type: 'agent',
        success: 'Agent response created successfully',
      });
      return;
    }

    // If all parsing failed
    res.status(400).json({
      error: 'Invalid message format',
      details: [
        ...voiceMessageResult.error?.issues || [],
        ...agentResponseResult.error?.issues || [],
        ...createVoiceResult.error?.issues || [],
        ...createAgentResult.error?.issues || [],
      ],
    });
  } catch (error) {
    logger.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// GET /api/messages/:messageId - Get a specific message
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    // Since we don't have a direct getMessage method, we'll search in recent messages
    // In a production environment, you'd want to add a getMessage method to the database service
    const recentMessages = await database.getRecentMessages(1000);
    const message = recentMessages.find(m => m.id === messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message });
  } catch (error) {
    logger.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// GET /api/messages/session/:sessionId - Get all messages for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const queryResult = GetMessagesQuerySchema.safeParse(req.query);
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify session exists
    const session = await database.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await database.getSessionMessages(sessionId);
    
    // Apply additional filtering if provided
    let filteredMessages = messages;
    const { type, limit = 50, offset = 0, startDate, endDate } = queryResult.success ? queryResult.data : {};

    if (type) {
      filteredMessages = filteredMessages.filter(m => m.type === type);
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      filteredMessages = filteredMessages.filter(message => {
        const messageDate = new Date(message.timestamp);
        return messageDate >= start && messageDate <= end;
      });
    }

    // Apply pagination
    const paginatedMessages = filteredMessages.slice(offset, offset + limit);

    // Calculate statistics
    const stats = {
      total: messages.length,
      user: messages.filter(m => m.type === 'user').length,
      agent: messages.filter(m => m.type === 'agent').length,
      averageConfidence: messages
        .filter(m => m.type === 'agent')
        .reduce((sum, m) => sum + (m as AgentResponse).confidence, 0) / 
        Math.max(messages.filter(m => m.type === 'agent').length, 1),
      sessionDuration: session.endTime 
        ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
        : Math.floor((Date.now() - session.startTime.getTime()) / 1000),
    };

    res.json({
      session,
      messages: paginatedMessages,
      stats,
      pagination: {
        total: filteredMessages.length,
        limit,
        offset,
        hasMore: offset + limit < filteredMessages.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching session messages:', error);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
});

// GET /api/messages/type/:type - Get messages by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const queryResult = GetMessagesQuerySchema.safeParse(req.query);
    
    if (!type || !['user', 'agent'].includes(type)) {
      return res.status(400).json({ error: 'Valid message type (user or agent) is required' });
    }

    const { limit = 50, offset = 0, startDate, endDate } = queryResult.success ? queryResult.data : {};

    const messages = await database.getMessagesByType(type as 'user' | 'agent', 1000);
    
    // Apply date filtering if provided
    let filteredMessages = messages;
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      filteredMessages = messages.filter(message => {
        const messageDate = new Date(message.timestamp);
        return messageDate >= start && messageDate <= end;
      });
    }

    // Apply pagination
    const paginatedMessages = filteredMessages.slice(offset, offset + limit);

    // Calculate statistics for this type
    const stats = {
      total: filteredMessages.length,
      averageConfidence: type === 'agent' 
        ? filteredMessages.reduce((sum, m) => sum + (m as AgentResponse).confidence, 0) / Math.max(filteredMessages.length, 1)
        : null,
      averageContentLength: filteredMessages.reduce((sum, m) => sum + m.content.length, 0) / Math.max(filteredMessages.length, 1),
    };

    res.json({
      messages: paginatedMessages,
      type,
      stats,
      pagination: {
        total: filteredMessages.length,
        limit,
        offset,
        hasMore: offset + limit < filteredMessages.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching messages by type:', error);
    res.status(500).json({ error: 'Failed to fetch messages by type' });
  }
});

// GET /api/messages/stats - Get message statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const recentMessages = await database.getRecentMessages(10000); // Get more messages for stats
    
    let filteredMessages = recentMessages;
    
    // Apply date filtering if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      filteredMessages = recentMessages.filter(message => {
        const messageDate = new Date(message.timestamp);
        return messageDate >= start && messageDate <= end;
      });
    }

    const userMessages = filteredMessages.filter(m => m.type === 'user');
    const agentMessages = filteredMessages.filter(m => m.type === 'agent');

    const stats = {
      total: filteredMessages.length,
      user: userMessages.length,
      agent: agentMessages.length,
      averageConfidence: agentMessages.length > 0 
        ? agentMessages.reduce((sum, m) => sum + (m as AgentResponse).confidence, 0) / agentMessages.length
        : 0,
      averageUserMessageLength: userMessages.length > 0
        ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length
        : 0,
      averageAgentMessageLength: agentMessages.length > 0
        ? agentMessages.reduce((sum, m) => sum + m.content.length, 0) / agentMessages.length
        : 0,
      messagesPerHour: filteredMessages.length > 0 ? {
        // Group messages by hour for the last 24 hours
        ...Array.from({ length: 24 }, (_, i) => {
          const hour = new Date();
          hour.setHours(hour.getHours() - (23 - i));
          hour.setMinutes(0, 0, 0);
          const nextHour = new Date(hour);
          nextHour.setHours(hour.getHours() + 1);
          
          const hourMessages = filteredMessages.filter(m => {
            const messageDate = new Date(m.timestamp);
            return messageDate >= hour && messageDate < nextHour;
          });
          
          return { hour: hour.toISOString(), count: hourMessages.length };
        }).reduce((acc, { hour, count }) => ({ ...acc, [hour]: count }), {})
      } : {},
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Error fetching message statistics:', error);
    res.status(500).json({ error: 'Failed to fetch message statistics' });
  }
});

export default router;