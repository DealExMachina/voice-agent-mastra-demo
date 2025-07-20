import type { Session, Message, User } from '@voice-agent-mastra-demo/shared';
import { vi } from 'vitest';

// Test server configuration
export const TEST_CONFIG = {
  port: 3002,
  databasePath: ':memory:',
  logLevel: 'silent',
};

// Mock sessions for testing
export const mockSessions: Session[] = [
  {
    id: 'session-1',
    userId: 'user-1',
    startTime: new Date('2024-01-15T10:00:00Z'),
    status: 'active',
    metadata: { test: true },
  },
  {
    id: 'session-2',
    userId: 'user-2',
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T09:30:00Z'),
    status: 'ended',
    metadata: { test: true },
  },
];

// Mock messages for testing
export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    content: 'Hello, how are you?',
    timestamp: new Date('2024-01-15T10:01:00Z'),
    userId: 'user-1',
    sessionId: 'session-1',
    type: 'user',
  },
  {
    id: 'agent-1',
    content: 'I\'m doing well, thank you! How can I help you?',
    timestamp: new Date('2024-01-15T10:01:30Z'),
    sessionId: 'session-1',
    confidence: 0.95,
    type: 'agent',
  },
  {
    id: 'msg-2',
    content: 'Can you help me with my project?',
    timestamp: new Date('2024-01-15T10:02:00Z'),
    userId: 'user-1',
    sessionId: 'session-1',
    type: 'user',
  },
];

// Mock users for testing
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Test User 1',
    email: 'test1@example.com',
    preferences: {
      language: 'en',
      voiceSpeed: 1.0,
      voiceType: 'neutral',
      notifications: true,
    },
  },
  {
    id: 'user-2',
    name: 'Test User 2',
    email: 'test2@example.com',
    preferences: {
      language: 'es',
      voiceSpeed: 1.2,
      voiceType: 'female',
      notifications: false,
    },
  },
];

// Mock LiveKit token response
export const mockLiveKitToken = {
  token: 'mock-livekit-token',
  url: 'wss://test.livekit.io',
  roomName: 'test-room',
  participantName: 'test-participant',
};

// Mock API request bodies
export const mockCreateSessionRequest = {
  userId: 'test-user-id',
};

export const mockCreateMessageRequest = {
  id: 'test-message-id',
  content: 'Test message content',
  timestamp: new Date().toISOString(),
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  type: 'user' as const,
};

export const mockCreateLiveKitTokenRequest = {
  roomName: 'test-room',
  participantName: 'test-participant',
};

// Test utilities
export const createTestSession = (overrides: Partial<Session> = {}): Session => ({
  id: `session-${Date.now()}`,
  userId: `user-${Date.now()}`,
  startTime: new Date(),
  status: 'active',
  ...overrides,
});

export const createTestMessage = (overrides: Partial<Message> = {}): Message => {
  const baseMessage = {
    id: `msg-${Date.now()}`,
    content: 'Test message',
    timestamp: new Date(),
    sessionId: `session-${Date.now()}`,
    type: 'user' as const,
    ...overrides,
  };

  if (baseMessage.type === 'user') {
    return {
      ...baseMessage,
      userId: `user-${Date.now()}`,
    } as any;
  } else {
    return {
      ...baseMessage,
      confidence: 0.95,
    } as any;
  }
};

export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: `user-${Date.now()}`,
  name: 'Test User',
  email: 'test@example.com',
  preferences: {
    language: 'en',
    voiceSpeed: 1.0,
    voiceType: 'neutral',
    notifications: true,
  },
  ...overrides,
});

// Mock Express request/response objects
export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

// Mock Socket.IO objects
export const createMockSocket = () => ({
  id: `socket-${Date.now()}`,
  emit: vi.fn(),
  on: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  disconnect: vi.fn(),
});

export const createMockServer = () => ({
  on: vi.fn(),
  emit: vi.fn(),
  to: vi.fn().mockReturnValue({
    emit: vi.fn(),
  }),
  in: vi.fn().mockReturnValue({
    emit: vi.fn(),
  }),
});