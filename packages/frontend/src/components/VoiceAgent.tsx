import React, { useEffect } from 'react';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { ChatHeader } from './chat/ChatHeader.js';
import { MessageList } from './chat/MessageList.js';
import { MessageInput } from './chat/MessageInput.js';
import { ErrorDisplay } from './chat/ErrorDisplay.js';
import { LoadingSpinner } from './chat/LoadingSpinner.js';
import { EntityPanel } from './EntityPanel.js';
import { ConversationControls } from './ConversationControls.js';
import { SummaryPanel } from './SummaryPanel.js';

const VoiceAgent: React.FC = () => {
  const {
    messages,
    inputText,
    isConnected,
    session,
    isLoading,
    error,
    isRecording,
    conversationActive,
    transcription,
    entities,
    summary,
    initializeSession,
    startConversation,
    stopConversation,
    sendMessage,
    toggleRecording,
    updateState,
  } = useVoiceAgent();

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  if (isLoading) {
    return <LoadingSpinner message="Initializing session..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={initializeSession} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <ChatHeader session={session} isConnected={isConnected} />
          <ConversationControls
            isActive={conversationActive}
            onStart={startConversation}
            onStop={stopConversation}
          />
        </div>

        {/* Transcription Display */}
        {conversationActive && (
          <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-blue-800">
                Live Transcription
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${conversationActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-xs text-blue-600">
                  {conversationActive ? 'Recording' : 'Stopped'}
                </span>
              </div>
            </div>
            <div className="text-blue-900 min-h-[1.5rem] bg-white rounded p-2 border border-blue-200">
              {transcription || "Listening..."}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={messages} />
        </div>

        {/* Summary Panel */}
        {summary && (
          <div className="bg-green-50 border-t border-green-200 p-4">
            <SummaryPanel summary={summary} />
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <MessageInput
            inputText={inputText}
            onInputChange={(value) => updateState({ inputText: value })}
            onSendMessage={sendMessage}
            onToggleRecording={toggleRecording}
            isRecording={isRecording}
            disabled={conversationActive}
          />
        </div>
      </div>

      {/* Right Panel - Entities */}
      <div className="w-80 bg-white border-l border-gray-200 p-4 shadow-lg">
        <EntityPanel 
          entities={entities}
          isActive={conversationActive}
        />
      </div>
    </div>
  );
};

export default VoiceAgent; 