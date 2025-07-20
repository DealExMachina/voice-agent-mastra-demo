import type { Session, Message, VoiceMessage, AgentResponse } from '@voice-agent-mastra-demo/shared';
import { vi } from 'vitest';

// Mock session data
export const mockSession: Session = {
  id: 'session-123',
  userId: 'user-456',
  startTime: new Date('2024-01-15T10:00:00Z'),
  status: 'active',
  metadata: {
    platform: 'web',
    userAgent: 'Mozilla/5.0...',
  },
};

// Mock messages
export const mockVoiceMessage: VoiceMessage = {
  id: 'msg-123',
  content: 'Hello, how are you today?',
  timestamp: new Date('2024-01-15T10:30:00Z'),
  userId: 'user-456',
  sessionId: 'session-123',
  type: 'user',
};

export const mockAgentResponse: AgentResponse = {
  id: 'agent-123',
  content: 'Hello! I\'m doing well, thank you for asking. How can I assist you today?',
  timestamp: new Date('2024-01-15T10:30:30Z'),
  sessionId: 'session-123',
  confidence: 0.95,
  type: 'agent',
  metadata: {
    model: 'gpt-4',
    tokens: 25,
  },
};

export const mockMessages: Message[] = [
  mockVoiceMessage,
  mockAgentResponse,
  {
    id: 'msg-124',
    content: 'Can you help me with my project?',
    timestamp: new Date('2024-01-15T10:31:00Z'),
    userId: 'user-456',
    sessionId: 'session-123',
    type: 'user',
  },
  {
    id: 'agent-124',
    content: 'I\'d be happy to help you with your project! What kind of project are you working on?',
    timestamp: new Date('2024-01-15T10:31:30Z'),
    sessionId: 'session-123',
    confidence: 0.92,
    type: 'agent',
    metadata: {
      model: 'gpt-4',
      tokens: 30,
    },
  },
];

// Mock API responses
export const mockCreateSessionResponse = {
  session: mockSession,
};

export const mockCreateMessageResponse = {
  message: mockVoiceMessage,
};

export const mockLiveKitTokenResponse = {
  token: 'mock-livekit-token',
  url: 'wss://test.livekit.io',
  roomName: 'test-room',
  participantName: 'test-participant',
};

// Mock fetch responses
export const createMockFetchResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

export const createMockFetchError = (status = 500, message = 'Internal Server Error') => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  });
};

// Mock Socket.IO events
export const mockSocketEvents = {
  session_messages: mockMessages,
  new_message: mockVoiceMessage,
  agent_response: mockAgentResponse,
  error: 'Connection error',
};

// Test utilities
export const createTestSession = (overrides: Partial<Session> = {}): Session => ({
  id: `session-${Date.now()}`,
  userId: `user-${Date.now()}`,
  startTime: new Date(),
  status: 'active',
  ...overrides,
});

export const createTestVoiceMessage = (overrides: Partial<VoiceMessage> = {}): VoiceMessage => ({
  id: `msg-${Date.now()}`,
  content: 'Test message',
  timestamp: new Date(),
  userId: `user-${Date.now()}`,
  sessionId: `session-${Date.now()}`,
  type: 'user',
  ...overrides,
});

export const createTestAgentResponse = (overrides: Partial<AgentResponse> = {}): AgentResponse => ({
  id: `agent-${Date.now()}`,
  content: 'Test agent response',
  timestamp: new Date(),
  sessionId: `session-${Date.now()}`,
  confidence: 0.9,
  type: 'agent',
  ...overrides,
});

// Mock DOM utilities
export const createMockElement = (tagName: string, className?: string) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  return element;
};

export const createMockInput = (value = '', type = 'text') => {
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  return input;
};

export const createMockButton = (text = 'Click me', disabled = false) => {
  const button = document.createElement('button');
  button.textContent = text;
  button.disabled = disabled;
  return button;
};

// Mock React component props
export const mockButtonProps = {
  variant: 'primary' as const,
  size: 'md' as const,
  children: 'Test Button',
  onClick: vi.fn(),
};

export const mockInputProps = {
  label: 'Test Input',
  placeholder: 'Enter text...',
  value: '',
  onChange: vi.fn(),
};

export const mockMessageListProps = {
  messages: mockMessages,
};

export const mockMessageInputProps = {
  inputText: '',
  onInputChange: vi.fn(),
  onSendMessage: vi.fn(),
  onToggleRecording: vi.fn(),
  isRecording: false,
};

export const mockChatHeaderProps = {
  session: mockSession,
  isConnected: true,
};

export const mockErrorDisplayProps = {
  error: 'Test error message',
  onRetry: vi.fn(),
};

export const mockLoadingSpinnerProps = {
  message: 'Loading...',
};

// Mock useVoiceAgent hook state
export const mockVoiceAgentState = {
  messages: mockMessages,
  inputText: '',
  isConnected: true,
  session: mockSession,
  isLoading: false,
  error: null,
  isRecording: false,
  room: null,
  socket: null,
};

export const mockVoiceAgentActions = {
  initializeSession: vi.fn(),
  sendMessage: vi.fn(),
  toggleRecording: vi.fn(),
  updateState: vi.fn(),
};