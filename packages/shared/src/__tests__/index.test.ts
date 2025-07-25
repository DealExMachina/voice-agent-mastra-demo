import { describe, it, expect } from 'vitest';
import {
  generateId,
  formatTimestamp,
  createTimestamp,
  validateVoiceMessage,
  validateAgentResponse,
  validateSession,
  validateUser,
  isVoiceMessage,
  isAgentResponse,
  isSession,
  safeParseVoiceMessage,
  safeParseAgentResponse,
  safeParseSession,
  ValidationError,
  SessionError,
  AgentError,
  DEFAULT_USER_PREFERENCES,
  SESSION_TIMEOUT_MS,
  MAX_MESSAGE_LENGTH,
  MAX_SESSION_MESSAGES,
} from '../index.js';
import {
  mockVoiceMessage,
  mockVoiceMessages,
  mockAgentResponse,
  mockAgentResponses,
  mockSession,
  mockSessions,
  mockUser,
  mockUsers,
  invalidVoiceMessage,
  invalidAgentResponse,
  invalidSession,
  invalidUser,
} from './fixtures.js';

describe('Shared Package', () => {
  describe('Utility Functions', () => {
    describe('generateId', () => {
      it('should generate a unique string ID', () => {
        const id1 = generateId();
        const id2 = generateId();
        
        expect(id1).toBeTypeOf('string');
        expect(id1.length).toBeGreaterThan(0);
        expect(id1).not.toBe(id2);
      });
    });

    describe('formatTimestamp', () => {
      it('should format date to ISO string', () => {
        const date = new Date('2024-01-15T10:30:00Z');
        const formatted = formatTimestamp(date);
        
        expect(formatted).toBe('2024-01-15T10:30:00.000Z');
      });
    });

    describe('createTimestamp', () => {
      it('should create a new Date object', () => {
        const before = new Date();
        const timestamp = createTimestamp();
        const after = new Date();
        
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });
  });

  describe('Validation Functions', () => {
    describe('validateVoiceMessage', () => {
      it('should validate a valid voice message', () => {
        const result = validateVoiceMessage(mockVoiceMessage);
        expect(result).toEqual(mockVoiceMessage);
      });

      it('should throw ValidationError for invalid voice message', () => {
        expect(() => validateVoiceMessage(invalidVoiceMessage)).toThrow(ValidationError);
      });

      it('should validate all mock voice messages', () => {
        mockVoiceMessages.forEach(message => {
          expect(() => validateVoiceMessage(message)).not.toThrow();
        });
      });
    });

    describe('validateAgentResponse', () => {
      it('should validate a valid agent response', () => {
        const result = validateAgentResponse(mockAgentResponse);
        expect(result).toEqual(mockAgentResponse);
      });

      it('should throw ValidationError for invalid agent response', () => {
        expect(() => validateAgentResponse(invalidAgentResponse)).toThrow(ValidationError);
      });

      it('should validate all mock agent responses', () => {
        mockAgentResponses.forEach(response => {
          expect(() => validateAgentResponse(response)).not.toThrow();
        });
      });
    });

    describe('validateSession', () => {
      it('should validate a valid session', () => {
        const result = validateSession(mockSession);
        expect(result).toEqual(mockSession);
      });

      it('should throw ValidationError for invalid session', () => {
        expect(() => validateSession(invalidSession)).toThrow(ValidationError);
      });

      it('should validate all mock sessions', () => {
        mockSessions.forEach(session => {
          expect(() => validateSession(session)).not.toThrow();
        });
      });
    });

    describe('validateUser', () => {
      it('should validate a valid user', () => {
        const result = validateUser(mockUser);
        expect(result).toEqual(mockUser);
      });

      it('should throw ValidationError for invalid user', () => {
        expect(() => validateUser(invalidUser)).toThrow(ValidationError);
      });

      it('should validate all mock users', () => {
        mockUsers.forEach(user => {
          expect(() => validateUser(user)).not.toThrow();
        });
      });
    });
  });

  describe('Type Guards', () => {
    describe('isVoiceMessage', () => {
      it('should return true for valid voice message', () => {
        expect(isVoiceMessage(mockVoiceMessage)).toBe(true);
      });

      it('should return false for invalid voice message', () => {
        expect(isVoiceMessage(invalidVoiceMessage)).toBe(false);
      });

      it('should return false for other types', () => {
        expect(isVoiceMessage(mockAgentResponse)).toBe(false);
        expect(isVoiceMessage(mockSession)).toBe(false);
        expect(isVoiceMessage(null)).toBe(false);
        expect(isVoiceMessage(undefined)).toBe(false);
      });
    });

    describe('isAgentResponse', () => {
      it('should return true for valid agent response', () => {
        expect(isAgentResponse(mockAgentResponse)).toBe(true);
      });

      it('should return false for invalid agent response', () => {
        expect(isAgentResponse(invalidAgentResponse)).toBe(false);
      });

      it('should return false for other types', () => {
        expect(isAgentResponse(mockVoiceMessage)).toBe(false);
        expect(isAgentResponse(mockSession)).toBe(false);
        expect(isAgentResponse(null)).toBe(false);
        expect(isAgentResponse(undefined)).toBe(false);
      });
    });

    describe('isSession', () => {
      it('should return true for valid session', () => {
        expect(isSession(mockSession)).toBe(true);
      });

      it('should return false for invalid session', () => {
        expect(isSession(invalidSession)).toBe(false);
      });

      it('should return false for other types', () => {
        expect(isSession(mockVoiceMessage)).toBe(false);
        expect(isSession(mockAgentResponse)).toBe(false);
        expect(isSession(null)).toBe(false);
        expect(isSession(undefined)).toBe(false);
      });
    });
  });

  describe('Safe Parse Functions', () => {
    describe('safeParseVoiceMessage', () => {
      it('should return success for valid voice message', () => {
        const result = safeParseVoiceMessage(mockVoiceMessage);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockVoiceMessage);
        }
      });

      it('should return error for invalid voice message', () => {
        const result = safeParseVoiceMessage(invalidVoiceMessage);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });

    describe('safeParseAgentResponse', () => {
      it('should return success for valid agent response', () => {
        const result = safeParseAgentResponse(mockAgentResponse);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockAgentResponse);
        }
      });

      it('should return error for invalid agent response', () => {
        const result = safeParseAgentResponse(invalidAgentResponse);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });

    describe('safeParseSession', () => {
      it('should return success for valid session', () => {
        const result = safeParseSession(mockSession);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSession);
        }
      });

      it('should return error for invalid session', () => {
        const result = safeParseSession(invalidSession);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });
    });
  });

  describe('Error Classes', () => {
    describe('ValidationError', () => {
      it('should create ValidationError with message and issues', () => {
        const issues = [{ code: 'invalid_type' as const, path: ['id'], message: 'Required', expected: 'string' as const, received: 'undefined' as const }];
        const error = new ValidationError('Validation failed', issues);
        
        expect(error.message).toBe('Validation failed');
        expect(error.issues).toEqual(issues);
        expect(error.name).toBe('ValidationError');
      });
    });

    describe('SessionError', () => {
      it('should create SessionError with message and optional sessionId', () => {
        const error = new SessionError('Session not found', 'session-123');
        
        expect(error.message).toBe('Session not found');
        expect(error.sessionId).toBe('session-123');
        expect(error.name).toBe('SessionError');
      });

      it('should create SessionError without sessionId', () => {
        const error = new SessionError('Session error');
        
        expect(error.message).toBe('Session error');
        expect(error.sessionId).toBeUndefined();
        expect(error.name).toBe('SessionError');
      });
    });

    describe('AgentError', () => {
      it('should create AgentError with message and optional code', () => {
        const error = new AgentError('Agent unavailable', 'AGENT_OFFLINE');
        
        expect(error.message).toBe('Agent unavailable');
        expect(error.code).toBe('AGENT_OFFLINE');
        expect(error.name).toBe('AgentError');
      });

      it('should create AgentError without code', () => {
        const error = new AgentError('Agent error');
        
        expect(error.message).toBe('Agent error');
        expect(error.code).toBeUndefined();
        expect(error.name).toBe('AgentError');
      });
    });
  });

  describe('Constants', () => {
    it('should have correct default user preferences', () => {
      expect(DEFAULT_USER_PREFERENCES).toEqual({
        language: 'en',
        voiceSpeed: 1.0,
        voiceType: 'neutral',
        notifications: true,
      });
    });

    it('should have correct session timeout', () => {
      expect(SESSION_TIMEOUT_MS).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should have correct max message length', () => {
      expect(MAX_MESSAGE_LENGTH).toBe(1000);
    });

    it('should have correct max session messages', () => {
      expect(MAX_SESSION_MESSAGES).toBe(1000);
    });
  });
});