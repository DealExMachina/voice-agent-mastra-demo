import { Router } from 'express';
import { z } from 'zod';
import { AccessToken } from 'livekit-server-sdk';
import { logger } from '../utils/logger.js';
import { config, getLiveKitConfig } from '../config/env.js';
import { database } from '../services/database.js';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const GenerateTokenSchema = z.object({
  roomName: z.string().min(1, 'Room name is required'),
  participantName: z.string().min(1, 'Participant name is required'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const RoomInfoSchema = z.object({
  roomName: z.string().min(1, 'Room name is required'),
});

const liveKitConfig = getLiveKitConfig();

// POST /api/livekit/token - Generate LiveKit access token
router.post('/token', async (req, res) => {
  try {
    const bodyResult = GenerateTokenSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const { roomName, participantName, userId, sessionId, metadata } = bodyResult.data;

    // Create access token
    const at = new AccessToken(liveKitConfig.apiKey, liveKitConfig.apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify({
        userId,
        sessionId,
        ...metadata,
      }),
    });

    // Add grants for room access
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    
    // Log analytics event
    if (sessionId) {
      await database.logEvent('livekit_token_generated', sessionId, userId, {
        roomName,
        participantName,
        metadata,
      });
    }
    
    logger.info(`Generated LiveKit token for ${participantName} in room ${roomName}`, {
      userId,
      sessionId,
      roomName,
    });
    
    res.json({
      token,
      url: liveKitConfig.url,
      roomName,
      participantName,
      expiresIn: 3600, // 1 hour
      metadata: {
        userId,
        sessionId,
        ...metadata,
      },
    });
  } catch (error) {
    logger.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// POST /api/livekit/room/join - Join a room (creates token and logs event)
router.post('/room/join', async (req, res) => {
  try {
    const bodyResult = GenerateTokenSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const { roomName, participantName, userId, sessionId, metadata } = bodyResult.data;

    // Verify session exists if provided
    if (sessionId) {
      const session = await database.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    // Create access token
    const at = new AccessToken(liveKitConfig.apiKey, liveKitConfig.apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify({
        userId,
        sessionId,
        joinTime: new Date().toISOString(),
        ...metadata,
      }),
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    
    // Log room join event
    if (sessionId) {
      await database.logEvent('livekit_room_joined', sessionId, userId, {
        roomName,
        participantName,
        joinTime: new Date().toISOString(),
        metadata,
      });
    }
    
    logger.info(`User ${participantName} joining room ${roomName}`, {
      userId,
      sessionId,
      roomName,
    });
    
    res.json({
      token,
      url: liveKitConfig.url,
      roomName,
      participantName,
      expiresIn: 3600,
      joinTime: new Date().toISOString(),
      metadata: {
        userId,
        sessionId,
        ...metadata,
      },
    });
  } catch (error) {
    logger.error('Error joining LiveKit room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// POST /api/livekit/room/leave - Leave a room (logs event)
router.post('/room/leave', async (req, res) => {
  try {
    const bodyResult = z.object({
      roomName: z.string().min(1, 'Room name is required'),
      participantName: z.string().min(1, 'Participant name is required'),
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }).safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const { roomName, participantName, userId, sessionId, metadata } = bodyResult.data;

    // Log room leave event
    if (sessionId) {
      await database.logEvent('livekit_room_left', sessionId, userId, {
        roomName,
        participantName,
        leaveTime: new Date().toISOString(),
        metadata,
      });
    }
    
    logger.info(`User ${participantName} left room ${roomName}`, {
      userId,
      sessionId,
      roomName,
    });
    
    res.json({
      message: 'Room leave event logged',
      roomName,
      participantName,
      leaveTime: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error logging room leave:', error);
    res.status(500).json({ error: 'Failed to log room leave' });
  }
});

// GET /api/livekit/room/:roomName - Get room information
router.get('/room/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // In a production environment, you'd want to use LiveKit's RoomServiceClient
    // to get actual room information. For now, we'll return basic info.
    
    // Get analytics events for this room
    const analytics = await database.getAnalytics(1000);
    const roomEvents = analytics.filter(event => 
      event.metadata && 
      typeof event.metadata === 'object' && 
      'roomName' in event.metadata && 
      event.metadata.roomName === roomName
    );

    const roomInfo = {
      roomName,
      events: roomEvents.length,
      participants: new Set(roomEvents.map(e => e.metadata?.participantName).filter(Boolean)).size,
      lastActivity: roomEvents.length > 0 ? roomEvents[0].createdAt : null,
      eventTypes: roomEvents.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json({ roomInfo });
  } catch (error) {
    logger.error('Error fetching room information:', error);
    res.status(500).json({ error: 'Failed to fetch room information' });
  }
});

// GET /api/livekit/config - Get LiveKit configuration
router.get('/config', async (req, res) => {
  try {
    res.json({
      url: liveKitConfig.url,
      apiKey: liveKitConfig.apiKey ? '***' : undefined, // Don't expose full API key
      features: {
        audio: true,
        video: false, // Voice-only for this demo
        data: true,
        screenShare: false,
      },
      limits: {
        maxParticipants: 10,
        maxDuration: 3600, // 1 hour
        maxBitrate: 64000, // 64 kbps for voice
      },
    });
  } catch (error) {
    logger.error('Error fetching LiveKit config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// POST /api/livekit/webhook - Handle LiveKit webhooks
router.post('/webhook', async (req, res) => {
  try {
    const { event, room, participant } = req.body;
    
    logger.info('LiveKit webhook received', { event, room: room?.name, participant: participant?.identity });
    
    // Log webhook event
    await database.logEvent(`livekit_webhook_${event}`, undefined, participant?.identity, {
      room: room?.name,
      participant: participant?.identity,
      timestamp: new Date().toISOString(),
      webhookData: req.body,
    });
    
    // Handle specific events
    switch (event) {
      case 'room_started':
        logger.info(`Room ${room?.name} started`);
        break;
      case 'room_finished':
        logger.info(`Room ${room?.name} finished`);
        break;
      case 'participant_joined':
        logger.info(`Participant ${participant?.identity} joined room ${room?.name}`);
        break;
      case 'participant_left':
        logger.info(`Participant ${participant?.identity} left room ${room?.name}`);
        break;
      default:
        logger.info(`Unhandled LiveKit webhook event: ${event}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing LiveKit webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// GET /api/livekit/analytics - Get LiveKit analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, roomName } = req.query;
    
    const analytics = await database.getAnalytics(1000);
    
    let filteredAnalytics = analytics.filter(event => 
      event.eventType.startsWith('livekit_')
    );

    // Apply date filtering if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      filteredAnalytics = filteredAnalytics.filter(event => {
        const eventDate = new Date(event.createdAt);
        return eventDate >= start && eventDate <= end;
      });
    }

    // Apply room filtering if provided
    if (roomName) {
      filteredAnalytics = filteredAnalytics.filter(event => 
        event.metadata && 
        typeof event.metadata === 'object' && 
        'roomName' in event.metadata && 
        event.metadata.roomName === roomName
      );
    }

    // Calculate statistics
    const eventTypeCounts = filteredAnalytics.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const roomStats = filteredAnalytics.reduce((acc, event) => {
      const roomName = event.metadata?.roomName;
      if (roomName) {
        if (!acc[roomName]) {
          acc[roomName] = {
            events: 0,
            participants: new Set(),
            lastActivity: null,
          };
        }
        acc[roomName].events++;
        if (event.metadata?.participantName) {
          acc[roomName].participants.add(event.metadata.participantName);
        }
        if (!acc[roomName].lastActivity || event.createdAt > acc[roomName].lastActivity) {
          acc[roomName].lastActivity = event.createdAt;
        }
      }
      return acc;
    }, {} as Record<string, { events: number; participants: Set<string>; lastActivity: Date | null }>);

    // Convert Sets to counts
    Object.keys(roomStats).forEach(roomName => {
      roomStats[roomName].participants = roomStats[roomName].participants.size as any;
    });

    const stats = {
      total: filteredAnalytics.length,
      eventTypes: eventTypeCounts,
      rooms: Object.keys(roomStats).length,
      roomStats,
      uniqueParticipants: new Set(
        filteredAnalytics
          .map(e => e.metadata?.participantName)
          .filter(Boolean)
      ).size,
    };

    res.json({
      analytics: filteredAnalytics,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching LiveKit analytics:', error);
    res.status(500).json({ error: 'Failed to fetch LiveKit analytics' });
  }
});

export default router;