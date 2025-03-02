import { Position } from '@fedjobs/types';
import { PositionItem } from './PositionItem';

interface PositionListSelectorProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  selectedState: Record<string, { selectedActivities: number[]; selectedAccomplishments: number[] }>;
  onSelectionChange: (newState: typeof selectedState) => void;
}

export function PositionListSelector({
  employmentHistory,
  otherPositions,
  selectedState,
  onSelectionChange
}: PositionListSelectorProps) {
  // Sort positions by date (descending)
  const sortByDate = (positions: Position[]) => {
    return [...positions].sort((a, b) => {
      const aDate = a.date.endDate || a.date.startDate;
      const bDate = b.date.endDate || b.date.startDate;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  };
  
  const sortedEmploymentHistory = sortByDate(employmentHistory);
  const sortedOtherPositions = sortByDate(otherPositions);
  
  // Update selection state for a position
  const handleSelectionChange = (positionUuid: string, type: 'activities' | 'accomplishments', idx: number) => {
    const current = selectedState[positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };
    
    const arrayToUpdate = type === 'activities' ? current.selectedActivities : current.selectedAccomplishments;
    let newArray: number[];
    
    if (arrayToUpdate.includes(idx)) {
      newArray = arrayToUpdate.filter(i => i !== idx);
    } else {
      newArray = [...arrayToUpdate, idx];
    }
    
    const newState = {
      ...selectedState,
      [positionUuid]: {
        ...current,
        [type === 'activities' ? 'selectedActivities' : 'selectedAccomplishments']: newArray,
      },
    };
    
    onSelectionChange(newState);
  };
  
  // Select all items in a position
  const handleSelectAll = (position: Position) => {
    const current = selectedState[position.positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };
    
    const allActivities = Array.from({ length: position.details.activities.length }, (_, i) => i);
    const allAccomplishments = Array.from({ length: position.details.accomplishments.length }, (_, i) => i);
    
    const newState = {
      ...selectedState,
      [position.positionUuid]: {
        ...current,
        selectedActivities: allActivities,
        selectedAccomplishments: allAccomplishments,
      },
    };
    
    onSelectionChange(newState);
  };
  
  // Clear all selections for a position
  const handleClearAll = (position: Position) => {
    const current = selectedState[position.positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };
    
    const newState = {
      ...selectedState,
      [position.positionUuid]: {
        ...current,
        selectedActivities: [],
        selectedAccomplishments: [],
      },
    };
    
    onSelectionChange(newState);
  };

  return (
    <div className="bg-white p-4 my-4 rounded border">
      <h2 className="text-xl font-bold mb-4">Select Positions for Generation</h2>
      
      {/* Employment History Positions */}
      {sortedEmploymentHistory.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mb-2">Employment History</h3>
          {sortedEmploymentHistory.map((position) => (
            <PositionItem
              key={position.positionUuid}
              position={position}
              selections={selectedState[position.positionUuid] || {
                selectedActivities: [],
                selectedAccomplishments: [],
              }}
              onSelectionChange={handleSelectionChange}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
            />
          ))}
        </>
      )}
      
      {/* Other Positions */}
      {sortedOtherPositions.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mt-6 mb-2">Other Positions</h3>
          {sortedOtherPositions.map((position) => (
            <PositionItem
              key={position.positionUuid}
              position={position}
              selections={selectedState[position.positionUuid] || {
                selectedActivities: [],
                selectedAccomplishments: [],
              }}
              onSelectionChange={handleSelectionChange}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
            />
          ))}
        </>
      )}
      
      {/* Show message if no positions */}
      {sortedEmploymentHistory.length === 0 && sortedOtherPositions.length === 0 && (
        <p className="text-gray-500 py-4">No positions available. Please upload your resume or add positions through the Review Positions page.</p>
      )}
    </div>
  );
}