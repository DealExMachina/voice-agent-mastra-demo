import React from 'react';
import { Entity } from '@voice-agent-mastra-demo/shared';

interface EntityPanelProps {
  entities: Entity[];
  isActive: boolean;
}

export const EntityPanel: React.FC<EntityPanelProps> = ({ entities, isActive }) => {
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  const entityTypeColors: Record<string, string> = {
    person: 'bg-blue-100 text-blue-800 border-blue-200',
    organization: 'bg-purple-100 text-purple-800 border-purple-200',
    location: 'bg-green-100 text-green-800 border-green-200',
    date: 'bg-orange-100 text-orange-800 border-orange-200',
    money: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    time: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    email: 'bg-pink-100 text-pink-800 border-pink-200',
    phone: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const getEntityTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      person: '👤',
      organization: '🏢',
      location: '📍',
      date: '📅',
      money: '💰',
      time: '⏰',
      email: '📧',
      phone: '📞',
      default: '🏷️'
    };
    return icons[type] || icons.default;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">Recognized Entities</h2>
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`} />
            {isActive && (
              <span className="text-xs text-green-600 font-medium">Live</span>
            )}
          </div>
        </div>
        {entities.length > 0 && (
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {entities.length} total
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        {Object.entries(groupedEntities).map(([type, typeEntities]) => (
          <div
            key={type}
            className={`rounded-lg border p-4 transition-all duration-300 hover:shadow-md ${
              entityTypeColors[type] || entityTypeColors.default
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center space-x-2 text-sm font-semibold">
                <span className="text-lg">{getEntityTypeIcon(type)}</span>
                <span className="capitalize">{type}</span>
              </h3>
              <span className="text-xs font-medium px-2 py-1 bg-white bg-opacity-50 rounded-full">
                {typeEntities.length}
              </span>
            </div>
            
            <div className="space-y-2">
              {typeEntities.map((entity, index) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between bg-white bg-opacity-70 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-opacity-90 animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="font-medium text-gray-900 flex-1 mr-2">
                    {entity.value}
                  </span>
                  <span className={`text-xs font-semibold ${getConfidenceColor(entity.confidence)}`}>
                    {Math.round(entity.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {entities.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 mt-12 space-y-4">
          <div className="text-4xl mb-2">
            {isActive ? '👂' : '💬'}
          </div>
          <div className="text-sm font-medium">
            {isActive ? "Listening for entities..." : "Start talking to extract entities"}
          </div>
          <div className="text-xs text-gray-400 max-w-xs">
            {isActive 
              ? "I'll identify people, places, dates, and other important information as you speak"
              : "Click 'Start Conversation' to begin real-time entity recognition"
            }
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {entities.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Quick Stats</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-700">Types</div>
              <div className="text-gray-600">{Object.keys(groupedEntities).length}</div>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <div className="font-semibold text-gray-700">Avg Confidence</div>
              <div className="text-gray-600">
                {Math.round((entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 