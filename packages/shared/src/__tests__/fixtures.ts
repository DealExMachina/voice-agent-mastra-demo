import type { VoiceMessage, AgentResponse, Session, User, UserPreferences } from '../index.js';

// Test fixtures for VoiceMessage
export const mockVoiceMessage: VoiceMessage = {
  id: 'msg-123',
  content: 'Hello, how are you today?',
  timestamp: new Date('2024-01-15T10:30:00Z'),
  userId: 'user-456',
  sessionId: 'session-789',
  type: 'user',
};

export const mockVoiceMessages: VoiceMessage[] = [
  mockVoiceMessage,
  {
    id: 'msg-124',
    content: 'Can you help me with my project?',
    timestamp: new Date('2024-01-15T10:31:00Z'),
    userId: 'user-456',
    sessionId: 'session-789',
    type: 'user',
  },
  {
    id: 'msg-125',
    content: 'What time is the meeting?',
    timestamp: new Date('2024-01-15T10:32:00Z'),
    userId: 'user-456',
    sessionId: 'session-789',
    type: 'user',
  },
];

// Test fixtures for AgentResponse
export const mockAgentResponse: AgentResponse = {
  id: 'agent-123',
  content: 'Hello! I\'m doing well, thank you for asking. How can I assist you today?',
  timestamp: new Date('2024-01-15T10:30:30Z'),
  sessionId: 'session-789',
  confidence: 0.95,
  type: 'agent',
  metadata: {
    model: 'gpt-4',
    tokens: 25,
  },
};

export const mockAgentResponses: AgentResponse[] = [
  mockAgentResponse,
  {
    id: 'agent-124',
    content: 'I\'d be happy to help you with your project! What kind of project are you working on?',
    timestamp: new Date('2024-01-15T10:31:30Z'),
    sessionId: 'session-789',
    confidence: 0.92,
    type: 'agent',
    metadata: {
      model: 'gpt-4',
      tokens: 30,
    },
  },
];

// Test fixtures for Session
export const mockSession: Session = {
  id: 'session-789',
  userId: 'user-456',
  startTime: new Date('2024-01-15T10:00:00Z'),
  status: 'active',
  metadata: {
    platform: 'web',
    userAgent: 'Mozilla/5.0...',
  },
};

export const mockSessions: Session[] = [
  mockSession,
  {
    id: 'session-790',
    userId: 'user-456',
    startTime: new Date('2024-01-15T09:00:00Z'),
    endTime: new Date('2024-01-15T09:30:00Z'),
    status: 'ended',
    metadata: {
      platform: 'mobile',
      duration: 1800000,
    },
  },
];

// Test fixtures for User
export const mockUserPreferences: UserPreferences = {
  language: 'en',
  voiceSpeed: 1.0,
  voiceType: 'neutral',
  notifications: true,
};

export const mockUser: User = {
  id: 'user-456',
  name: 'John Doe',
  email: 'john.doe@example.com',
  preferences: mockUserPreferences,
};

export const mockUsers: User[] = [
  mockUser,
  {
    id: 'user-457',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    preferences: {
      language: 'es',
      voiceSpeed: 1.2,
      voiceType: 'female',
      notifications: false,
    },
  },
];

// Invalid test data for negative testing
export const invalidVoiceMessage = {
  id: '',
  content: '',
  timestamp: 'invalid-date',
  userId: '',
  sessionId: '',
  type: 'invalid',
};

export const invalidAgentResponse = {
  id: '',
  content: '',
  timestamp: 'invalid-date',
  sessionId: '',
  confidence: 1.5, // Invalid confidence > 1
  type: 'invalid',
};

export const invalidSession = {
  id: '',
  userId: '',
  startTime: 'invalid-date',
  status: 'invalid-status',
};

export const invalidUser = {
  id: '',
  name: '',
  email: 'invalid-email',
  preferences: {
    language: '',
    voiceSpeed: -1, // Invalid speed
    voiceType: '',
    notifications: 'not-boolean',
  },
};