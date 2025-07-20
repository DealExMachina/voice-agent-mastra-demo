import React, { useEffect } from 'react';
import { useVoiceAgent } from '../../hooks/useVoiceAgent.js';
import { ChatHeader } from './chat/ChatHeader.js';
import { MessageList } from './chat/MessageList.js';
import { MessageInput } from './chat/MessageInput.js';
import { ErrorDisplay } from './chat/ErrorDisplay.js';
import { LoadingSpinner } from './chat/LoadingSpinner.js';

const VoiceAgent: React.FC = () => {
  const {
    messages,
    inputText,
    isConnected,
    session,
    isLoading,
    error,
    isRecording,
    initializeSession,
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        <ChatHeader session={session} isConnected={isConnected} />
        <MessageList messages={messages} />
        <MessageInput
          inputText={inputText}
          onInputChange={(value) => updateState({ inputText: value })}
          onSendMessage={sendMessage}
          onToggleRecording={toggleRecording}
          isRecording={isRecording}
        />
      </div>
    </div>
  );
};

export default VoiceAgent; 