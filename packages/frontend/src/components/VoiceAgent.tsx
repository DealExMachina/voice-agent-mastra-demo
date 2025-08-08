import React, { useEffect } from 'react';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { MessageList } from './chat/MessageList.js';
import { MessageInput } from './chat/MessageInput.js';
import { ErrorDisplay } from './chat/ErrorDisplay.js';
import { LoadingSpinner } from './chat/LoadingSpinner.js';

const VoiceAgent: React.FC = () => {
  const {
    messages,
    inputText,
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
    return <LoadingSpinner message="Loading..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={initializeSession} />;
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto px-4 pt-6">
          <MessageList messages={messages} />
        </div>
        <div className="border-t px-4 py-3">
          <MessageInput
            inputText={inputText}
            onInputChange={(value) => updateState({ inputText: value })}
            onSendMessage={sendMessage}
            onToggleRecording={toggleRecording}
            isRecording={isRecording}
            disabled={false}
          />
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent; 