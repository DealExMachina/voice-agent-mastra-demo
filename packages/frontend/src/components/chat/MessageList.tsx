import React from 'react';
import { clsx } from 'clsx';
import type { Message } from '@voice-agent-mastra-demo/shared';

interface MessageListProps {
  messages: Message[];
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  return (
    <div className={clsx('h-[calc(100vh-8rem)] overflow-y-auto p-4 space-y-3', className)}>
      {messages.length === 0 ? (
        <div className="text-center text-gray-400 py-12 text-sm">
          <p>Start a conversation…</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={clsx(
                'max-w-[70%] px-3 py-2 rounded-2xl text-sm',
                message.type === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              <p className="break-words leading-relaxed">{message.content}</p>
              <p className="text-[10px] opacity-60 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};