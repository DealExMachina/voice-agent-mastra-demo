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
  Entity,
  ConversationSummary,
  type Message
} from '@voice-agent-mastra-demo/shared';

import { getApiUrl } from '../config/env.js';

// Type declarations for browser APIs
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

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
  
  // New state for conversation flow
  conversationActive: boolean;
  transcription: string;
  entities: Entity[];
  summary: ConversationSummary | null;
  isTranscribing: boolean;
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
    
    // New state for conversation flow
    conversationActive: false,
    transcription: '',
    entities: [],
    summary: null,
    isTranscribing: false,
  });

  // Additional state for speech recognition management
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');

  const updateState = useCallback((updates: Partial<VoiceAgentState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const generateSummary = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/ai/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) throw new Error('Failed to generate summary');
      
      const { summary } = await response.json();
      return summary;
    } catch (error) {
      console.error('Failed to generate summary:', error);
      return null;
    }
  }, []);

  const startTranscription = useCallback(async () => {
    try {
      // Check if SpeechRecognition is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition not supported in this browser');
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = currentTranscription;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        const newTranscription = finalTranscript + interimTranscript;
        updateState({ transcription: newTranscription });
        
        // Send final transcription to backend for entity extraction
        if (event.results[event.results.length - 1].isFinal && state.socket && state.session) {
          setCurrentTranscription(finalTranscript);
          state.socket.emit('transcription_update', {
            sessionId: state.session.id,
            content: finalTranscript,
            isFinal: true
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        updateState({ isTranscribing: false });
      };

      recognition.onend = () => {
        // Only restart if conversation is still active and this is the current recognition
        if (state.conversationActive && speechRecognition === recognition) {
          setTimeout(() => {
            if (state.conversationActive) {
              try {
                recognition.start();
              } catch (error) {
                // Handle restart error silently
              }
            }
          }, 100);
        }
      };
      
      setSpeechRecognition(recognition);
      recognition.start();
      updateState({ isTranscribing: true });
    } catch (error) {
      updateState({ error: 'Speech recognition not available' });
    }
  }, [speechRecognition, currentTranscription, state.socket, state.session, state.conversationActive, updateState]);

  const stopTranscription = useCallback(async () => {
    if (speechRecognition) {
      speechRecognition.stop();
      setSpeechRecognition(null);
    }
    updateState({ isTranscribing: false });
  }, [speechRecognition, updateState]);

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

      // New Socket.IO events for real-time updates
      socket.on('entities_updated', (data: { sessionId: string; entities: Entity[]; transcription: string }) => {
        setState(prev => ({
          ...prev,
          entities: data.entities,
          transcription: data.transcription,
        }));
      });

      socket.on('conversation_summary', (summary: ConversationSummary) => {
        setState(prev => ({
          ...prev,
          summary,
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

  // New methods for conversation flow
  const startConversation = useCallback(async () => {
    if (!state.session) return;
    
    try {
      updateState({ 
        conversationActive: true, 
        transcription: '', 
        entities: [],
        summary: null 
      });
      
      // Start transcription service
      await startTranscription();
      
      // Initialize AI processing
      state.socket?.emit('start_conversation', { sessionId: state.session.id });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [state.session, state.socket, updateState, startTranscription]);

  const stopConversation = useCallback(async () => {
    if (!state.session) return;
    
    try {
      updateState({ conversationActive: false, isTranscribing: false });
      
      // Stop transcription
      await stopTranscription();
      
      // Generate summary
      const summary = await generateSummary(state.session.id);
      updateState({ summary });
      
      // End conversation
      state.socket?.emit('end_conversation', { sessionId: state.session.id });
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    }
  }, [state.session, state.socket, updateState, stopTranscription, generateSummary]);

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
      if (speechRecognition) {
        speechRecognition.stop();
      }
      if (state.socket) {
        state.socket.disconnect();
      }
      if (state.room) {
        state.room.disconnect();
      }
    };
  }, [speechRecognition, state.socket, state.room]);

  return {
    ...state,
    initializeSession,
    startConversation,
    stopConversation,
    sendMessage,
    toggleRecording,
    clearError,
    updateState,
  };
}