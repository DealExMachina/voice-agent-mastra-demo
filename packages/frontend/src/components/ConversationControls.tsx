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
    <div className="flex items-center space-x-4 mt-4">
      {!isActive ? (
        <button
          type="button"
          onClick={onStart}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Start conversation"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Start Conversation
        </button>
      ) : (
        <button
          type="button"
          onClick={onStop}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          aria-label="End conversation"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          End Conversation
        </button>
      )}
    </div>
  );
}; 