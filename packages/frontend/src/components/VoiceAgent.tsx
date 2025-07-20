import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client';
import { clsx } from 'clsx';
import { Phone, PhoneOff } from 'lucide-react';

import { 
  VoiceMessage, 
  AgentResponse, 
  Session,
  type Message
} from '@voice-agent-mastra-demo/shared';

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

const VoiceAgent: React.FC = () => {
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

      const response = await fetch('/api/sessions', {
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
      const socket = io('http://localhost:3001');
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
      const response = await fetch('/api/livekit/token', {
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
      const response = await fetch('/api/messages', {
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

  useEffect(() => {
    initializeSession();

    return () => {
      if (state.socket) {
        state.socket.disconnect();
      }
      if (state.room) {
        state.room.disconnect();
      }
    };
  }, [initializeSession]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600 mt-2">{state.error}</p>
        <button
          type="button"
          onClick={initializeSession}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Voice Agent Chat</h2>
              <p className="text-gray-600 text-sm">
                {state.session ? `Session: ${state.session.id}` : 'No session'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={clsx(
                'w-3 h-3 rounded-full',
                state.isConnected ? 'bg-green-500' : 'bg-red-500'
              )}></div>
              <span className="text-sm text-gray-600">
                {state.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {state.messages.map((message) => (
            <div
              key={message.id}
              className={clsx(
                'flex',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={clsx(
                  'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                <p>{message.content}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={state.inputText}
              onChange={(e) => updateState({ inputText: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!state.inputText.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
            <button
              type="button"
              onClick={toggleRecording}
              className={clsx(
                'p-3 rounded-full transition-colors',
                state.isRecording
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              )}
            >
              {state.isRecording ? <PhoneOff size={20} /> : <Phone size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent; 