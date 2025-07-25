import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client';

import { 
  VoiceMessage, 
  AgentResponse, 
  Session,
  type Message
} from '@voice-agent-mastra-demo/shared';

import { getApiUrl } from '../config/env.js';

interface VoiceAgentState {
  messages: Message[];
  inputText: string;
  isConnected: boolean;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  isRecording: boolean;
  room: Room | null;
  socket: Socket | null;
}

export function useVoiceAgent() {
  const [state, setState] = useState<VoiceAgentState>({
    messages: [],
    inputText: '',
    isConnected: false,
    session: null,
    isLoading: false,
    error: null,
    isRecording: false,
    room: null,
    socket: null,
  });

  const updateState = useCallback((updates: Partial<VoiceAgentState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });

      const response = await fetch(`${getApiUrl()}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: `user-${Date.now()}` }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { session } = await response.json();
      updateState({ session, isLoading: false });

      // Initialize Socket.IO connection
      const socket = io(getApiUrl());
      socket.emit('join_session', session.id);

      socket.on('session_messages', (messages: Message[]) => {
        updateState({ messages });
      });

      socket.on('new_message', (message: Message) => {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));
      });

      socket.on('agent_response', (response: AgentResponse) => {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, response]
        }));
      });

      updateState({ socket, isConnected: true });
    } catch (error) {
      console.error('Failed to initialize session:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Unknown error', 
        isLoading: false 
      });
    }
  }, [updateState]);

  const initializeLiveKit = useCallback(async () => {
    if (!state.session) return;

    try {
      const response = await fetch(`${getApiUrl()}/api/v1/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `session-${state.session.id}`,
          participantName: `user-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const { token, url } = await response.json();

      const room = new Room();
      
      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
        updateState({ room });
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        updateState({ room: null });
      });

      room.on(RoomEvent.TrackSubscribed, (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        _participant: RemoteParticipant
      ) => {
        if (track.kind === 'audio') {
          const audioElement = track.attach();
          document.body.appendChild(audioElement);
        }
      });

      await room.connect(url, token);
    } catch (error) {
      console.error('Failed to initialize LiveKit:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'LiveKit initialization failed' 
      });
    }
  }, [state.session, updateState]);

  const sendMessage = useCallback(async () => {
    if (!state.inputText.trim() || !state.session) return;

    const message: VoiceMessage = {
      id: crypto.randomUUID(),
      content: state.inputText,
      timestamp: new Date(),
      userId: `user-${Date.now()}`,
      sessionId: state.session.id,
      type: 'user',
    };

    try {
      const response = await fetch(`${getApiUrl()}/api/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        inputText: ''
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }
  }, [state.inputText, state.session, updateState]);

  const toggleRecording = useCallback(async () => {
    if (!state.room) {
      await initializeLiveKit();
      return;
    }

    try {
      if (state.isRecording) {
        await state.room.localParticipant.setMicrophoneEnabled(false);
        updateState({ isRecording: false });
      } else {
        await state.room.localParticipant.setMicrophoneEnabled(true);
        updateState({ isRecording: true });
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Recording toggle failed' 
      });
    }
  }, [state.room, state.isRecording, initializeLiveKit, updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.socket) {
        state.socket.disconnect();
      }
      if (state.room) {
        state.room.disconnect();
      }
    };
  }, [state.socket, state.room]);

  return {
    ...state,
    initializeSession,
    sendMessage,
    toggleRecording,
    clearError,
    updateState,
  };
}