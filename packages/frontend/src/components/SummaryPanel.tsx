import React from 'react';
import { ConversationSummary } from '@voice-agent-mastra-demo/shared';

interface SummaryPanelProps {
  summary: ConversationSummary;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary }) => {
  return (
    <div className="bg-white rounded-lg border border-green-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-green-800">Conversation Summary</h3>
        <span className="text-sm text-green-600">
          {new Date(summary.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
          <p className="text-gray-900">{summary.summary}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Key Points</h4>
          <ul className="list-disc list-inside space-y-1">
            {summary.keyPoints.map((point, index) => (
              <li key={`point-${index}-${point.substring(0, 10)}`} className="text-gray-900 text-sm">{point}</li>
            ))}
          </ul>
        </div>

        <div className="flex items-center space-x-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Sentiment: </span>
            <span className={`text-sm font-medium ${
              summary.sentiment === 'positive' ? 'text-green-600' :
              summary.sentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {summary.sentiment}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Entities: </span>
            <span className="text-sm text-gray-900">{summary.entities.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 