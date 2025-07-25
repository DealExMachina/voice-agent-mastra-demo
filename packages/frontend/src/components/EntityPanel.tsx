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

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Extracted Entities</h2>
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
      </div>

      <div className="space-y-4">
        {Object.entries(groupedEntities).map(([type, typeEntities]) => (
          <div key={type} className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-2 capitalize">
              {type} ({typeEntities.length})
            </h3>
            <div className="space-y-1">
              {typeEntities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between bg-white rounded px-2 py-1 text-sm"
                >
                  <span className="text-gray-900">{entity.value}</span>
                  <span className="text-xs text-gray-500">
                    {Math.round(entity.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {entities.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          {isActive ? "Listening for entities..." : "No entities extracted yet"}
        </div>
      )}
    </div>
  );
}; 