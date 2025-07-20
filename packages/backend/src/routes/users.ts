import { Router } from 'express';
import { z } from 'zod';
import { database } from '../services/database.js';
import { logger } from '../utils/logger.js';
import { generateId, validateUser } from '@voice-agent-mastra-demo/shared';
import type { User, UserPreferences } from '@voice-agent-mastra-demo/shared';

const router: ReturnType<typeof Router> = Router();

// Validation schemas
const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  preferences: z.object({
    language: z.string().min(1, 'Language is required'),
    voiceSpeed: z.number().min(0.5).max(2.0, 'Voice speed must be between 0.5 and 2.0'),
    voiceType: z.string().min(1, 'Voice type is required'),
    notifications: z.boolean(),
  }).optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  preferences: z.object({
    language: z.string().min(1, 'Language is required'),
    voiceSpeed: z.number().min(0.5).max(2.0, 'Voice speed must be between 0.5 and 2.0'),
    voiceType: z.string().min(1, 'Voice type is required'),
    notifications: z.boolean(),
  }).optional(),
});

const GetUsersQuerySchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
  search: z.string().optional(),
});

// GET /api/users - Get all users with filtering
router.get('/', async (req, res) => {
  try {
    const queryResult = GetUsersQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.issues,
      });
    }

    const { limit = 50, offset = 0, search } = queryResult.data;

    // For now, we'll get all users and filter in memory
    // In production, you'd want to add proper user listing methods to the database service
    const allUsers: User[] = []; // This would come from database.getAllUsers()
    
    // Mock data for demonstration - replace with actual database call
    const mockUsers: User[] = [
      {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        preferences: {
          language: 'en',
          voiceSpeed: 1.0,
          voiceType: 'male',
          notifications: true,
        },
      },
      {
        id: 'user2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        preferences: {
          language: 'en',
          voiceSpeed: 1.2,
          voiceType: 'female',
          notifications: false,
        },
      },
    ];

    let filteredUsers = mockUsers;

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = mockUsers.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    res.json({
      users: paginatedUsers,
      pagination: {
        total: filteredUsers.length,
        limit,
        offset,
        hasMore: offset + limit < filteredUsers.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create a new user
router.post('/', async (req, res) => {
  try {
    const bodyResult = CreateUserSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const { name, email, preferences } = bodyResult.data;

    // Check if user with email already exists
    const existingUser = await database.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const defaultPreferences: UserPreferences = {
      language: 'en',
      voiceSpeed: 1.0,
      voiceType: 'default',
      notifications: true,
    };

    const user: User = {
      id: generateId(),
      name,
      email,
      preferences: preferences || defaultPreferences,
    };

    const createdUser = await database.createUser(user);
    
    logger.info(`Created user ${user.id} with email ${email}`);
    
    res.status(201).json({
      user: createdUser,
      message: 'User created successfully',
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users/:userId - Get a specific user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await database.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's sessions
    const userSessions = await database.getSessionsByUserId(userId);
    
    // Get user's recent messages
    const recentMessages = await database.getRecentMessages(100);
    const userMessages = recentMessages.filter(m => m.type === 'user' && (m as any).userId === userId);

    // Calculate user statistics
    const stats = {
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
      sessions: userSessions,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:userId - Update a user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bodyResult = UpdateUserSchema.safeParse(req.body);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    // Check if user exists
    const existingUser = await database.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates: Partial<User> = {};
    
    if (bodyResult.data.name) {
      updates.name = bodyResult.data.name;
    }
    
    if (bodyResult.data.email) {
      // Check if email is already taken by another user
      const userWithEmail = await database.getUserByEmail(bodyResult.data.email);
      if (userWithEmail && userWithEmail.id !== userId) {
        return res.status(409).json({ error: 'Email is already taken by another user' });
      }
      updates.email = bodyResult.data.email;
    }
    
    if (bodyResult.data.preferences) {
      updates.preferences = bodyResult.data.preferences;
    }

    await database.updateUser(userId, updates);
    
    // Get updated user
    const updatedUser = await database.getUser(userId);
    
    logger.info(`Updated user ${userId}`);
    
    res.json({
      user: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:userId - Delete a user
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const existingUser = await database.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has active sessions
    const userSessions = await database.getSessionsByUserId(userId);
    const activeSessions = userSessions.filter(s => s.status === 'active');
    
    if (activeSessions.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active sessions',
        activeSessions: activeSessions.length,
      });
    }

    // In a production environment, you'd want to implement soft delete
    // or cascade delete depending on your requirements
    // For now, we'll just log the deletion request
    logger.info(`Delete user request for ${userId} (not implemented)`);
    
    res.json({
      message: 'User deletion requested (not implemented in demo)',
      note: 'In production, implement proper user deletion with session cleanup',
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/users/:userId/sessions - Get user's sessions
router.get('/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    const queryResult = GetUsersQuerySchema.safeParse(req.query);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const user = await database.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userSessions = await database.getSessionsByUserId(userId);
    
    const { limit = 50, offset = 0 } = queryResult.success ? queryResult.data : {};

    // Apply pagination
    const paginatedSessions = userSessions.slice(offset, offset + limit);

    // Calculate session statistics
    const stats = {
      total: userSessions.length,
      active: userSessions.filter(s => s.status === 'active').length,
      ended: userSessions.filter(s => s.status === 'ended').length,
      paused: userSessions.filter(s => s.status === 'paused').length,
      averageDuration: userSessions.length > 0 
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
      sessions: paginatedSessions,
      stats,
      pagination: {
        total: userSessions.length,
        limit,
        offset,
        hasMore: offset + limit < userSessions.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching user sessions:', error);
    res.status(500).json({ error: 'Failed to fetch user sessions' });
  }
});

// GET /api/users/:userId/messages - Get user's messages
router.get('/:userId/messages', async (req, res) => {
  try {
    const { userId } = req.params;
    const queryResult = GetUsersQuerySchema.safeParse(req.query);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    const user = await database.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const recentMessages = await database.getRecentMessages(1000);
    const userMessages = recentMessages.filter(m => m.type === 'user' && (m as any).userId === userId);
    
    const { limit = 50, offset = 0 } = queryResult.success ? queryResult.data : {};

    // Apply pagination
    const paginatedMessages = userMessages.slice(offset, offset + limit);

    // Calculate message statistics
    const stats = {
      total: userMessages.length,
      user: userMessages.filter(m => m.type === 'user').length,
      agent: userMessages.filter(m => m.type === 'agent').length,
      averageContentLength: userMessages.length > 0
        ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length
        : 0,
    };

    res.json({
      user,
      messages: paginatedMessages,
      stats,
      pagination: {
        total: userMessages.length,
        limit,
        offset,
        hasMore: offset + limit < userMessages.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching user messages:', error);
    res.status(500).json({ error: 'Failed to fetch user messages' });
  }
});

// PUT /api/users/:userId/preferences - Update user preferences
router.put('/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferencesSchema = z.object({
      language: z.string().min(1, 'Language is required'),
      voiceSpeed: z.number().min(0.5).max(2.0, 'Voice speed must be between 0.5 and 2.0'),
      voiceType: z.string().min(1, 'Voice type is required'),
      notifications: z.boolean(),
    });

    const bodyResult = preferencesSchema.safeParse(req.body);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    if (!bodyResult.success) {
      return res.status(400).json({
        error: 'Invalid preferences format',
        details: bodyResult.error.issues,
      });
    }

    // Check if user exists
    const existingUser = await database.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await database.updateUser(userId, {
      preferences: bodyResult.data,
    });
    
    // Get updated user
    const updatedUser = await database.getUser(userId);
    
    logger.info(`Updated preferences for user ${userId}`);
    
    res.json({
      user: updatedUser,
      message: 'User preferences updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// GET /api/users/search/:email - Search user by email
router.get('/search/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await database.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Error searching user by email:', error);
    res.status(500).json({ error: 'Failed to search user' });
  }
});

export default router;