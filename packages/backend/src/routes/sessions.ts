import { Router } from 'express';
import { z } from 'zod';
import { database } from '../services/database.js';
import { logger } from '../utils/logger.js';
import { generateId, validateSession, safeParseSession } from '@voice-agent-mastra-demo/shared';
import type { Session } from '@voice-agent-mastra-demo/shared';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const CreateSessionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateSessionSchema = z.object({
  status: z.enum(['active', 'ended', 'paused']).optional(),
  endTime: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const GetSessionsQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(['active', 'ended', 'paused']).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
});

// GET /api/sessions - Get all sessions with filtering
router.get('/', async (req, res) => {
  try {
    const queryResult = GetSessionsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.issues,
      });
    }

    const { userId, status, limit = 50, offset = 0 } = queryResult.data;

    // Check if database is available
    if (!database) {
      throw new Error('Database service not available');
    }

    let sessions: Session[];
    if (userId) {
      sessions = await database.getSessionsByUserId(userId);
    } else if (status === 'active') {
      sessions = await database.getActiveSessions();
    } else {
      // For now, get all sessions (in production, you'd want pagination)
      sessions = await database.getActiveSessions(); // This needs to be enhanced
    }

    // Apply pagination
    const paginatedSessions = sessions.slice(offset, offset + limit);

    res.json({
      sessions: paginatedSessions,
      pagination: {
        total: sessions.length,
        limit,
        offset,
        hasMore: offset + limit < sessions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    logger.error('Error fetching sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/sessions - Create a new session
router.post('/', async (req, res) => {
  try {
    const bodyResult = CreateSessionSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const { userId, metadata } = bodyResult.data;

    const session: Session = {
      id: generateId(),
      userId,
      startTime: new Date(),
      status: 'active',
      metadata: metadata || {},
    };

    const createdSession = await database.createSession(session);
    
    logger.info(`Created session ${session.id} for user ${userId}`);
    
    res.status(201).json({
      session: createdSession,
      message: 'Session created successfully',
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/sessions/:sessionId - Get a specific session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await database.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get session messages
    const messages = await database.getSessionMessages(sessionId);
    
    // Get session statistics
    const stats = await database.getDatabaseStats();

    res.json({
      session,
      messages,
      stats: {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.type === 'user').length,
        agentMessages: messages.filter(m => m.type === 'agent').length,
        sessionDuration: session.endTime 
          ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
          : Math.floor((Date.now() - session.startTime.getTime()) / 1000),
      },
    });
  } catch (error) {
    logger.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// PUT /api/sessions/:sessionId - Update a session
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const bodyResult = UpdateSessionSchema.safeParse(req.body);
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    // Check if session exists
    const existingSession = await database.getSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updates: Partial<Session> = {};
    
    if (bodyResult.data.status) {
      updates.status = bodyResult.data.status;
    }
    
    if (bodyResult.data.endTime) {
      updates.endTime = new Date(bodyResult.data.endTime);
    }
    
    if (bodyResult.data.metadata) {
      updates.metadata = bodyResult.data.metadata;
    }

    await database.updateSession(sessionId, updates);
    
    // Get updated session
    const updatedSession = await database.getSession(sessionId);
    
    logger.info(`Updated session ${sessionId}`);
    
    res.json({
      session: updatedSession,
      message: 'Session updated successfully',
    });
  } catch (error) {
    logger.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE /api/sessions/:sessionId - Delete a session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Check if session exists
    const existingSession = await database.getSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await database.deleteSession(sessionId);
    
    logger.info(`Deleted session ${sessionId}`);
    
    res.json({
      message: 'Session deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/sessions/:sessionId/end - End a session
router.post('/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Check if session exists
    const existingSession = await database.getSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (existingSession.status === 'ended') {
      return res.status(400).json({ error: 'Session is already ended' });
    }

    await database.updateSession(sessionId, {
      status: 'ended',
      endTime: new Date(),
    });
    
    const updatedSession = await database.getSession(sessionId);
    
    logger.info(`Ended session ${sessionId}`);
    
    res.json({
      session: updatedSession,
      message: 'Session ended successfully',
    });
  } catch (error) {
    logger.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// POST /api/sessions/:sessionId/pause - Pause a session
router.post('/:sessionId/pause', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Check if session exists
    const existingSession = await database.getSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (existingSession.status === 'paused') {
      return res.status(400).json({ error: 'Session is already paused' });
    }

    await database.updateSession(sessionId, {
      status: 'paused',
    });
    
    const updatedSession = await database.getSession(sessionId);
    
    logger.info(`Paused session ${sessionId}`);
    
    res.json({
      session: updatedSession,
      message: 'Session paused successfully',
    });
  } catch (error) {
    logger.error('Error pausing session:', error);
    res.status(500).json({ error: 'Failed to pause session' });
  }
});

// POST /api/sessions/:sessionId/resume - Resume a session
router.post('/:sessionId/resume', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Check if session exists
    const existingSession = await database.getSession(sessionId);
    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (existingSession.status === 'active') {
      return res.status(400).json({ error: 'Session is already active' });
    }

    await database.updateSession(sessionId, {
      status: 'active',
    });
    
    const updatedSession = await database.getSession(sessionId);
    
    logger.info(`Resumed session ${sessionId}`);
    
    res.json({
      session: updatedSession,
      message: 'Session resumed successfully',
    });
  } catch (error) {
    logger.error('Error resuming session:', error);
    res.status(500).json({ error: 'Failed to resume session' });
  }
});

export default router;