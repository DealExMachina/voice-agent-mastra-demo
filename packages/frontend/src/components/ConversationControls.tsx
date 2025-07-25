import React from 'react';

interface ConversationControlsProps {
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const ConversationControls: React.FC<ConversationControlsProps> = ({
  isActive,
  onStart,
  onStop,
}) => {
  return (
    <div className="flex items-center justify-center space-x-4 mt-4">
      {!isActive ? (
        <button
          type="button"
          onClick={onStart}
          className="flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
            <span>🎤</span>
          </div>
          <span>Start Voice Conversation</span>
        </button>
      ) : (
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onStop}
            className="flex items-center space-x-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-white rounded-full recording-indicator" />
              <span>🛑</span>
            </div>
            <span>Stop Conversation</span>
          </button>
          
          <div className="flex items-center space-x-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">Active - Listening</span>
          </div>
        </div>
      )}
      
      {/* Voice Instruction */}
      <div className="text-xs text-gray-500 max-w-xs text-center">
        {isActive 
          ? "Speak naturally. Entities will appear in the right panel in real-time."
          : "Click to start voice recognition and entity extraction"
        }
      </div>
    </div>
  );
}; 