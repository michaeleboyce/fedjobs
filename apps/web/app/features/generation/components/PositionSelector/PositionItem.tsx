// File path: apps/web/app/features/generation/components/PositionSelector/PositionItem.tsx
import { useState } from 'react';
import { Position } from '@fedjobs/types';

interface PositionItemProps {
  position: Position;
  selections: {
    selectedActivities: number[];
    selectedAccomplishments: number[];
  };
  onSelectionChange: (positionUuid: string, type: 'activities' | 'accomplishments', idx: number) => void;
  onSelectAll: (position: Position) => void;
  onClearAll: (position: Position) => void;
}

export function PositionItem({
  position,
  selections,
  onSelectionChange,
  onSelectAll,
  onClearAll
}: PositionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate selection stats
  const totalActivities = position.details.activities.length;
  const totalAccomplishments = position.details.accomplishments.length;
  const totalItems = totalActivities + totalAccomplishments;
  
  const selectedCount = selections.selectedActivities.length + selections.selectedAccomplishments.length;
  const isAllSelected = selectedCount === totalItems && totalItems > 0;
  
  // Toggle expansion
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="border p-4 rounded mb-4 bg-white" data-position-element="true">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-lg">{position.title.title}</h4>
          <p className="text-gray-600">{position.organization.name}</p>
          <p className="text-gray-500">
            {position.date.startDate} - {position.date.present ? 'Present' : position.date.endDate}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            className="bg-blue-500 text-white px-2 py-1 rounded"
            onClick={toggleExpand}
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>
      
      {/* Selection controls */}
      <div className="mt-2 flex items-center gap-2">
        <button
          className={`px-2 py-1 rounded ${
            isAllSelected ? 'bg-gray-400 text-white' : 'bg-green-500 text-white'
          }`}
          onClick={() => isAllSelected ? onClearAll(position) : onSelectAll(position)}
        >
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-sm text-gray-600">
          {selectedCount} of {totalItems} selected
        </span>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4">
          {/* Activities */}
          <div className="mb-4">
            <h5 className="font-semibold mb-2">Activities:</h5>
            <ul className="space-y-2">
              {position.details.activities.map((activity, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selections.selectedActivities.includes(idx)}
                    onChange={() => onSelectionChange(position.positionUuid, 'activities', idx)}
                    className="mt-1"
                  />
                  <span>{activity}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Accomplishments */}
          <div>
            <h5 className="font-semibold mb-2">Accomplishments:</h5>
            <ul className="space-y-2">
              {position.details.accomplishments.map((accomplishment, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selections.selectedAccomplishments.includes(idx)}
                    onChange={() => onSelectionChange(position.positionUuid, 'accomplishments', idx)}
                    className="mt-1"
                  />
                  <span>{accomplishment}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}