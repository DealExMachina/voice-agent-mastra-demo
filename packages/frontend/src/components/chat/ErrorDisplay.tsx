import React from 'react';
import { Button } from '../ui/Button.js';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 className="text-red-800 font-semibold">Error</h3>
      <p className="text-red-600 mt-2">{error}</p>
      <Button
        onClick={onRetry}
        variant="danger"
        size="md"
        className="mt-4"
      >
        Retry
      </Button>
    </div>
  );
};