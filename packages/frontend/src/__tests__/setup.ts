import { beforeAll, afterAll, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables
process.env.VITE_API_URL = 'http://localhost:3001';
process.env.VITE_APP_NAME = 'Voice Agent Test';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock LiveKit
vi.mock('livekit-client', () => ({
  Room: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    localParticipant: {
      setMicrophoneEnabled: vi.fn(),
    },
  })),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    TrackSubscribed: 'trackSubscribed',
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

beforeAll(() => {
  console.log('Setting up frontend test environment...');
});

afterAll(() => {
  console.log('Cleaning up frontend test environment...');
});