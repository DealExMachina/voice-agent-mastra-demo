import { Router } from 'express';
import { z } from 'zod';
import { database } from '../services/database.js';
import { logger } from '../utils/logger.js';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const AnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventType: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(1000)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
});

const LogEventSchema = z.object({
  eventType: z.string().min(1, 'Event type is required'),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/analytics - Get analytics data
router.get('/', async (req, res) => {
  try {
    const queryResult = AnalyticsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.issues,
      });
    }

    const { startDate, endDate, eventType, sessionId, userId, limit = 100, offset = 0 } = queryResult.data;

    const analytics = await database.getAnalytics(1000); // Get more for filtering
    
    let filteredAnalytics = analytics;

    // Apply filters
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      filteredAnalytics = analytics.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate >= start && eventDate <= end;
      });
    }

    if (eventType) {
      filteredAnalytics = filteredAnalytics.filter(event => event.eventType === eventType);
    }

    if (sessionId) {
      filteredAnalytics = filteredAnalytics.filter(event => event.sessionId === sessionId);
    }

    if (userId) {
      filteredAnalytics = filteredAnalytics.filter(event => event.userId === userId);
    }

    // Apply pagination
    const paginatedAnalytics = filteredAnalytics.slice(offset, offset + limit);

    // Calculate statistics
    const eventTypeCounts = filteredAnalytics.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      total: filteredAnalytics.length,
      eventTypes: eventTypeCounts,
      uniqueSessions: new Set(filteredAnalytics.map(e => e.sessionId).filter(Boolean)).size,
      uniqueUsers: new Set(filteredAnalytics.map(e => e.userId).filter(Boolean)).size,
    };

    res.json({
      analytics: paginatedAnalytics,
      stats,
      pagination: {
        total: filteredAnalytics.length,
        limit,
        offset,
        hasMore: offset + limit < filteredAnalytics.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// POST /api/analytics/events - Log a new analytics event
router.post('/events', async (req, res) => {
  try {
    const bodyResult = LogEventSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const { eventType, sessionId, userId, metadata } = bodyResult.data;

    await database.logEvent(eventType, sessionId, userId, metadata);
    
    logger.info(`Logged analytics event: ${eventType}`, { sessionId, userId });
    
    res.status(201).json({
      message: 'Analytics event logged successfully',
      event: {
        eventType,
        sessionId,
        userId,
        metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error logging analytics event:', error);
    res.status(500).json({ error: 'Failed to log analytics event' });
  }
});

// GET /api/analytics/dashboard - Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get database stats
    const dbStats = await database.getDatabaseStats();
    
    // Get analytics data
    const analytics = await database.getAnalytics(10000);
    
    let filteredAnalytics = analytics;
    
    // Apply date filtering if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      filteredAnalytics = analytics.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate >= start && eventDate <= end;
      });
    }

    // Calculate event statistics
    const eventTypeCounts = filteredAnalytics.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate hourly activity for the last 24 hours
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - (23 - i));
      hour.setMinutes(0, 0, 0);
      const nextHour = new Date(hour);
      nextHour.setHours(hour.getHours() + 1);
      
      const hourEvents = filteredAnalytics.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate >= hour && eventDate < nextHour;
      });
      
      return {
        hour: hour.toISOString(),
        count: hourEvents.length,
        eventTypes: hourEvents.reduce((acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    });

    // Get recent sessions
    const activeSessions = await database.getActiveSessions();
    
    // Get recent messages
    const recentMessages = await database.getRecentMessages(100);

    const dashboard = {
      overview: {
        totalSessions: dbStats.sessions,
        totalMessages: dbStats.messages,
        totalUsers: dbStats.users,
        activeSessions: dbStats.activeSessions,
        totalAnalytics: dbStats.totalAnalytics,
        databaseSize: dbStats.databaseSize,
      },
      activity: {
        totalEvents: filteredAnalytics.length,
        eventTypes: eventTypeCounts,
        hourlyActivity,
        uniqueSessions: new Set(filteredAnalytics.map(e => e.sessionId).filter(Boolean)).size,
        uniqueUsers: new Set(filteredAnalytics.map(e => e.userId).filter(Boolean)).size,
      },
      recent: {
        activeSessions: activeSessions.slice(0, 10),
        recentMessages: recentMessages.slice(0, 20),
        recentEvents: filteredAnalytics.slice(0, 20),
      },
      performance: {
        averageSessionDuration: activeSessions.length > 0 
          ? activeSessions.reduce((sum, session) => {
              const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
              return sum + duration;
            }, 0) / activeSessions.length
          : 0,
        messagesPerSession: dbStats.sessions > 0 ? dbStats.messages / dbStats.sessions : 0,
        eventsPerHour: filteredAnalytics.length > 0 ? filteredAnalytics.length / 24 : 0,
      },
    };

    res.json({ dashboard });
  } catch (error) {
    logger.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// GET /api/analytics/events/:eventType - Get events by type
router.get('/events/:eventType', async (req, res) => {
  try {
    const { eventType } = req.params;
    const queryResult = AnalyticsQuerySchema.safeParse(req.query);
    
    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    const { startDate, endDate, sessionId, userId, limit = 100, offset = 0 } = queryResult.success ? queryResult.data : {};

    const analytics = await database.getAnalytics(1000);
    
    let filteredAnalytics = analytics.filter(event => event.eventType === eventType);

    // Apply additional filters
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      filteredAnalytics = filteredAnalytics.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate >= start && eventDate <= end;
      });
    }

    if (sessionId) {
      filteredAnalytics = filteredAnalytics.filter(event => event.sessionId === sessionId);
    }

    if (userId) {
      filteredAnalytics = filteredAnalytics.filter(event => event.userId === userId);
    }

    // Apply pagination
    const paginatedAnalytics = filteredAnalytics.slice(offset, offset + limit);

    // Calculate statistics for this event type
    const stats = {
      total: filteredAnalytics.length,
      uniqueSessions: new Set(filteredAnalytics.map(e => e.sessionId).filter(Boolean)).size,
      uniqueUsers: new Set(filteredAnalytics.map(e => e.userId).filter(Boolean)).size,
      averagePerHour: filteredAnalytics.length > 0 ? filteredAnalytics.length / 24 : 0,
    };

    res.json({
      eventType,
      events: paginatedAnalytics,
      stats,
      pagination: {
        total: filteredAnalytics.length,
        limit,
        offset,
        hasMore: offset + limit < filteredAnalytics.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching events by type:', error);
    res.status(500).json({ error: 'Failed to fetch events by type' });
  }
});

// GET /api/analytics/sessions/:sessionId - Get analytics for a specific session
router.get('/sessions/:sessionId', async (req, res) => {
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

    const analytics = await database.getAnalytics(1000);
    const sessionAnalytics = analytics.filter(event => event.sessionId === sessionId);
    
    // Get session messages
    const sessionMessages = await database.getSessionMessages(sessionId);

    // Calculate session statistics
    const eventTypeCounts = sessionAnalytics.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      totalEvents: sessionAnalytics.length,
      eventTypes: eventTypeCounts,
      totalMessages: sessionMessages.length,
      userMessages: sessionMessages.filter(m => m.type === 'user').length,
      agentMessages: sessionMessages.filter(m => m.type === 'agent').length,
      sessionDuration: session.endTime 
        ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
        : Math.floor((Date.now() - session.startTime.getTime()) / 1000),
      averageConfidence: sessionMessages
        .filter(m => m.type === 'agent')
        .reduce((sum, m) => sum + (m as any).confidence, 0) / 
        Math.max(sessionMessages.filter(m => m.type === 'agent').length, 1),
    };

    res.json({
      session,
      analytics: sessionAnalytics,
      messages: sessionMessages,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching session analytics:', error);
    res.status(500).json({ error: 'Failed to fetch session analytics' });
  }
});

// GET /api/analytics/users/:userId - Get analytics for a specific user
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify user exists
    const user = await database.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const analytics = await database.getAnalytics(1000);
    const userAnalytics = analytics.filter(event => event.userId === userId);
    
    // Get user's sessions
    const userSessions = await database.getSessionsByUserId(userId);
    
    // Get user's messages
    const recentMessages = await database.getRecentMessages(1000);
    const userMessages = recentMessages.filter(m => m.type === 'user' && (m as any).userId === userId);

    // Calculate user statistics
    const eventTypeCounts = userAnalytics.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = {
      totalEvents: userAnalytics.length,
      eventTypes: eventTypeCounts,
      totalSessions: userSessions.length,
      activeSessions: userSessions.filter(s => s.status === 'active').length,
      totalMessages: userMessages.length,
      userMessages: userMessages.filter(m => m.type === 'user').length,
      agentMessages: userMessages.filter(m => m.type === 'agent').length,
      averageSessionDuration: userSessions.length > 0 
        ? userSessions.reduce((sum, session) => {
            const duration = session.endTime 
              ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
              : Math.floor((Date.now() - session.startTime.getTime()) / 1000);
            return sum + duration;
          }, 0) / userSessions.length
        : 0,
    };

    res.json({
      user,
      analytics: userAnalytics,
      sessions: userSessions,
      messages: userMessages,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// GET /api/analytics/health - Get system health metrics
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const dbStats = await database.getDatabaseStats();
    
    const analytics = await database.getAnalytics(100);
    const recentEvents = analytics.slice(0, 10);

    const health = {
      database: dbHealth,
      stats: dbStats,
      recentActivity: {
        events: recentEvents.length,
        lastEvent: recentEvents.length > 0 ? recentEvents[0].createdAt : null,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    };

    res.json({ health });
  } catch (error) {
    logger.error('Error fetching health metrics:', error);
    res.status(500).json({ error: 'Failed to fetch health metrics' });
  }
});

export default router;