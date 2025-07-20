import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
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
    <div className="p-6 border-t">
      <div className="flex items-center space-x-4">
        <Input
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={disabled}
          className="flex-1"
        />
        <Button
          onClick={onSendMessage}
          disabled={!inputText.trim() || disabled}
          size="md"
        >
          Send
        </Button>
        <Button
          onClick={onToggleRecording}
          variant={isRecording ? 'danger' : 'secondary'}
          size="md"
          className="p-3 rounded-full"
        >
          {isRecording ? <PhoneOff size={20} /> : <Phone size={20} />}
        </Button>
      </div>
    </div>
  );
};