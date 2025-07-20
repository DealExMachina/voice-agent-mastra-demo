// Shared types and utilities for Voice Agent Mastra Demo

export interface VoiceMessage {
  id: string;
  content: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
}

export interface AgentResponse {
  id: string;
  content: string;
  timestamp: Date;
  sessionId: string;
  confidence: number;
}

export interface Session {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'ended' | 'paused';
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

// Validation schemas
import { z } from 'zod';

export const VoiceMessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  timestamp: z.date(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export const AgentResponseSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  timestamp: z.date(),
  sessionId: z.string().uuid(),
  confidence: z.number().min(0).max(1),
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.enum(['active', 'ended', 'paused']),
});

// Utility functions
export function generateId(): string {
  return crypto.randomUUID();
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

export function validateVoiceMessage(data: unknown): VoiceMessage {
  return VoiceMessageSchema.parse(data);
}

export function validateAgentResponse(data: unknown): AgentResponse {
  return AgentResponseSchema.parse(data);
} 