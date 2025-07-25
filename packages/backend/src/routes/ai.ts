import { Router } from 'express';
import { z } from 'zod';
import { database } from '../services/database.js';
import { logger } from '../utils/logger.js';
import { aiIntegrationService } from '../services/ai-integration.js';
import { mastraAgentService } from '../services/mastra-agent.js';
import { mem0Service } from '../services/mem0.js';
import { generateId } from '@voice-agent-mastra-demo/shared';
import type { Message } from '@voice-agent-mastra-demo/shared';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const ProcessMessageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
});

const ProcessConversationSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  limit: z.number().min(1).max(100).optional(),
});

const SearchMemoriesSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  userId: z.string().min(1, 'User ID is required'),
  sessionId: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
  minImportance: z.number().min(0).max(1).optional(),
});

const GetUserMemoriesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['conversation', 'fact', 'preference', 'intent', 'emotion', 'context', 'relationship', 'custom']).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// GET /api/ai/status - Get AI services status
router.get('/status', async (req, res) => {
  try {
    const mastraReady = await mastraAgentService.isReady();
    const mem0Ready = mem0Service.isReady();
    const aiIntegrationReady = aiIntegrationService.isReady();
    
    const status = {
      mastra: mastraReady,
      mem0: mem0Ready,
      aiIntegration: aiIntegrationReady,
      timestamp: new Date().toISOString(),
    };

    res.json({
      status,
      message: status.aiIntegration 
        ? 'AI services are ready' 
        : 'AI services are not configured',
    });
  } catch (error) {
    logger.error('Error getting AI status:', error);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

// POST /api/ai/process-message - Process a single message with AI
router.post('/process-message', async (req, res) => {
  try {
    const validationResult = ProcessMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { messageId } = validationResult.data;

    // Get the message from database
    const messages = await database.getSessionMessages(messageId);
    const message = messages.find(m => m.id === messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Process the message with AI
    const result = await aiIntegrationService.processMessage(message);

    logger.info(`AI processed message ${messageId}: ${result.entities.length} entities, ${result.memories.length} memories`);

    res.json({
      messageId,
      result,
      success: true,
    });
  } catch (error) {
    logger.error('Error processing message with AI:', error);
    res.status(500).json({ error: 'Failed to process message with AI' });
  }
});

// POST /api/ai/process-conversation - Process a conversation with AI
router.post('/process-conversation', async (req, res) => {
  try {
    const validationResult = ProcessConversationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { sessionId, limit = 50 } = validationResult.data;

    // Verify session exists
    const session = await database.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get session messages
    const messages = await database.getSessionMessages(sessionId);
    const recentMessages = messages.slice(-limit);

    // Get relevant memories for context
    const userMemories = await mem0Service.getUserMemories(session.userId);
    const sessionMemories = await mem0Service.getSessionMemories(sessionId);

    const context = {
      userId: session.userId,
      sessionId,
      recentMessages,
      userMemories,
      sessionMemories,
    };

    // Process the conversation with AI
    const result = await aiIntegrationService.processConversation(recentMessages, context);

    logger.info(`AI processed conversation ${sessionId}: ${result.entities.length} entities, ${result.memories.length} memories`);

    res.json({
      sessionId,
      messageCount: recentMessages.length,
      result,
      success: true,
    });
  } catch (error) {
    logger.error('Error processing conversation with AI:', error);
    res.status(500).json({ error: 'Failed to process conversation with AI' });
  }
});

// POST /api/ai/search-memories - Search for memories
router.post('/search-memories', async (req, res) => {
  try {
    const validationResult = SearchMemoriesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { query, userId, sessionId, limit = 10, minImportance = 0.3 } = validationResult.data;

    const memories = await aiIntegrationService.searchMemories(query, userId, {
      sessionId,
      limit,
      minImportance,
    });

    logger.info(`Searched memories for user ${userId}: found ${memories.length} results`);

    res.json({
      query,
      userId,
      sessionId,
      memories,
      count: memories.length,
      success: true,
    });
  } catch (error) {
    logger.error('Error searching memories:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

// GET /api/ai/memories/user/:userId - Get user memories
router.get('/memories/user/:userId', async (req, res) => {
  try {
    const validationResult = GetUserMemoriesSchema.safeParse({
      userId: req.params.userId,
      ...req.query,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: validationResult.error.issues,
      });
    }

    const { userId, type, limit = 50 } = validationResult.data;

    const memories = await mem0Service.getUserMemories(userId, {
      type,
      limit,
    });

    logger.info(`Retrieved ${memories.length} memories for user ${userId}`);

    res.json({
      userId,
      memories,
      count: memories.length,
      success: true,
    });
  } catch (error) {
    logger.error('Error getting user memories:', error);
    res.status(500).json({ error: 'Failed to get user memories' });
  }
});

// GET /api/ai/memories/session/:sessionId - Get session memories
router.get('/memories/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Verify session exists
    const session = await database.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const memories = await mem0Service.getSessionMemories(sessionId);

    logger.info(`Retrieved ${memories.length} memories for session ${sessionId}`);

    res.json({
      sessionId,
      memories,
      count: memories.length,
      success: true,
    });
  } catch (error) {
    logger.error('Error getting session memories:', error);
    res.status(500).json({ error: 'Failed to get session memories' });
  }
});

// GET /api/ai/memories/stats/:userId - Get user memory statistics
router.get('/memories/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const stats = await aiIntegrationService.getUserMemoryStats(userId);

    logger.info(`Retrieved memory statistics for user ${userId}`);

    res.json({
      userId,
      stats,
      success: true,
    });
  } catch (error) {
    logger.error('Error getting memory statistics:', error);
    res.status(500).json({ error: 'Failed to get memory statistics' });
  }
});

// POST /api/ai/entities/extract - Extract entities from text
router.post('/entities/extract', async (req, res) => {
  try {
    const { text, context = 'message' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Create a mock message for entity extraction
    const mockMessage: Message = {
      id: generateId(),
      content: text,
      timestamp: new Date(),
      sessionId: 'mock-session',
      type: 'user',
      userId: 'mock-user',
    };

    const result = await mastraAgentService.extractEntitiesFromMessage(mockMessage);

    logger.info(`Extracted ${result.entities.length} entities from text`);

    res.json({
      text,
      context,
      entities: result.entities,
      summary: result.summary,
      sentiment: result.sentiment,
      topics: result.topics,
      success: true,
    });
  } catch (error) {
    logger.error('Error extracting entities:', error);
    res.status(500).json({ error: 'Failed to extract entities' });
  }
});

// GET /api/ai/entities/types - Get supported entity types
router.get('/entities/types', async (req, res) => {
  try {
    // Return supported entity types
    const entityTypes = [
      'person', 'organization', 'location', 'date', 'time', 'money',
      'percentage', 'email', 'phone', 'url', 'product', 'service',
      'event', 'concept', 'custom'
    ];
    
    res.json({
      entityTypes,
      count: entityTypes.length,
      success: true,
    });
  } catch (error) {
    logger.error('Error getting entity types:', error);
    res.status(500).json({ error: 'Failed to get entity types' });
  }
});

// POST /api/ai/process-transcription - Process real-time transcription
router.post('/process-transcription', async (req, res) => {
  try {
    const { sessionId, content, isFinal } = req.body;

    if (!sessionId || !content) {
      return res.status(400).json({ error: 'Session ID and content are required' });
    }

    // Create transcription message
    const transcriptionMessage = {
      id: generateId(),
      sessionId,
      content,
      timestamp: new Date(),
      isFinal,
      confidence: 0.9, // This would come from the speech recognition service
    };

    // Process with AI for entity extraction
    const result = await aiIntegrationService.processTranscription(transcriptionMessage);

    // Store transcription in database
    await database.storeTranscriptionMessage(transcriptionMessage);

    // Emit real-time updates via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('entities_updated', {
        sessionId,
        entities: result.entities,
        transcription: content,
      });
    }

    res.json({
      success: true,
      entities: result.entities,
      memories: result.memories,
    });
  } catch (error) {
    logger.error('Error processing transcription:', error);
    res.status(500).json({ error: 'Failed to process transcription' });
  }
});

// POST /api/ai/generate-summary - Generate conversation summary
router.post('/generate-summary', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get session messages
    const messages = await database.getSessionMessages(sessionId);
    
    // Get session entities
    const session = await database.getSession(sessionId);
    const entities = session?.conversationState?.entities || [];

    // Generate summary using AI
    const summary = await aiIntegrationService.generateConversationSummary(
      messages,
      entities,
      sessionId
    );

    // Store summary in database
    await database.storeConversationSummary(summary);

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// GET /api/ai/summary/:sessionId - Get conversation summary
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const summary = await database.getConversationSummary(sessionId);

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Error getting summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

export default router; 