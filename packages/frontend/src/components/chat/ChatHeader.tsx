import React from 'react';
import { clsx } from 'clsx';
import type { Session } from '@voice-agent-mastra-demo/shared';

interface ChatHeaderProps {
  session: Session | null;
  isConnected: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ session, isConnected }) => {
  return (
    <div className="p-6 border-b">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Voice Agent Chat</h2>
          <p className="text-gray-600 text-sm">
            {session ? `Session: ${session.id}` : 'No session'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={clsx(
            'w-3 h-3 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};