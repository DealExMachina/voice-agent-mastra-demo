// Shared types and utilities for Voice Agent Mastra Demo
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Core interfaces
export interface VoiceMessage {
  id: string;
  content: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  type: 'user';
}

export interface AgentResponse {
  id: string;
  content: string;
  timestamp: Date;
  sessionId: string;
  confidence: number;
  type: 'agent';
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'ended' | 'paused';
  metadata?: Record<string, unknown>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  voiceSpeed: number;
  voiceType: string;
  notifications: boolean;
}

// LiveKit-related types
export interface LiveKitConfig {
  wsUrl: string;
  apiKey: string;
  apiSecret: string;
}

export interface LiveKitToken {
  token: string;
  roomName: string;
  participantName: string;
}

// Validation schemas
export const VoiceMessageSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  timestamp: z.date(),
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  type: z.literal('user'),
});

export const AgentResponseSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  timestamp: z.date(),
  sessionId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  type: z.literal('agent'),
  metadata: z.record(z.unknown()).optional(),
});

export const SessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(['active', 'ended', 'paused']),
  metadata: z.record(z.unknown()).optional(),
});

export const UserPreferencesSchema = z.object({
  language: z.string().min(1),
  voiceSpeed: z.number().min(0.5).max(2.0),
  voiceType: z.string().min(1),
  notifications: z.boolean(),
});

export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  preferences: UserPreferencesSchema,
});

// Utility functions
export function generateId(): string {
  return nanoid();
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

export function createTimestamp(): Date {
  return new Date();
}

// Type-safe validation functions
export function validateVoiceMessage(data: unknown): VoiceMessage {
  return VoiceMessageSchema.parse(data);
}

export function validateAgentResponse(data: unknown): AgentResponse {
  return AgentResponseSchema.parse(data);
}

export function validateSession(data: unknown): Session {
  return SessionSchema.parse(data);
}

export function validateUser(data: unknown): User {
  return UserSchema.parse(data);
}

// Error types
export class ValidationError extends Error {
  constructor(message: string, public issues: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SessionError extends Error {
  constructor(message: string, public sessionId?: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class AgentError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AgentError';
  }
}

// Type guards
export function isVoiceMessage(obj: unknown): obj is VoiceMessage {
  return VoiceMessageSchema.safeParse(obj).success;
}

export function isAgentResponse(obj: unknown): obj is AgentResponse {
  return AgentResponseSchema.safeParse(obj).success;
}

export function isSession(obj: unknown): obj is Session {
  return SessionSchema.safeParse(obj).success;
}

// Safe parsing functions that return results instead of throwing
export function safeParseVoiceMessage(data: unknown) {
  return VoiceMessageSchema.safeParse(data);
}

export function safeParseAgentResponse(data: unknown) {
  return AgentResponseSchema.safeParse(data);
}

export function safeParseSession(data: unknown) {
  return SessionSchema.safeParse(data);
}

// Utility types
export type Message = VoiceMessage | AgentResponse;
export type MessageType = Message['type'];
export type SessionStatus = Session['status'];

// Constants
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'en',
  voiceSpeed: 1.0,
  voiceType: 'neutral',
  notifications: true,
};

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_SESSION_MESSAGES = 1000; 