import React from 'react';
import { Button } from '../ui/Button.js';
import { Input } from '../ui/Input.js';

interface MessageInputProps {
  inputText: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onToggleRecording: () => void;
  isRecording: boolean;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  inputText,
  onInputChange,
  onSendMessage,
  onToggleRecording,
  isRecording,
  disabled = false,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Message"
          disabled={disabled}
          className="flex-1 rounded-full"
        />
        <Button
          onClick={onSendMessage}
          disabled={!inputText.trim() || disabled}
          size="sm"
          variant="secondary"
          className="rounded-full"
        >
          Send
        </Button>
      </div>
    </div>
  );
};