// File path: apps/web/app/features/generation/components/PositionSelector/PositionListSelector.tsx
import { Position } from '@fedjobs/types';
import { PositionItem } from './PositionItem';
import { PositionSelectionState } from '@fedjobs/types';
import { sortPositions, groupPositionsByYear } from '@/app/shared/utils/positionSorting';
import { YearSidebar } from '@/app/shared/components/YearSidebar';
import { useEffect, useRef } from 'react';

interface PositionListSelectorProps {
  employmentHistory: Position[];
  otherPositions: Position[];
  selectedState: Record<string, { selectedActivities: number[]; selectedAccomplishments: number[] }>;
  onSelectionChange: (newState: PositionSelectionState) => void;
}

export function PositionListSelector({
  employmentHistory,
  otherPositions,
  selectedState,
  onSelectionChange
}: PositionListSelectorProps) {
  // Use the improved position sorting logic
  const sortedEmploymentHistory = sortPositions(employmentHistory);
  const sortedOtherPositions = sortPositions(otherPositions);
  
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

  // Group positions by year (using shared utility function)

  // Group positions for employment history and other positions
  const groupedEmployment = groupPositionsByYear(sortedEmploymentHistory);
  const groupedOther = groupPositionsByYear(sortedOtherPositions);

  // Ref to track if we've scrolled to the initial year
  const initialScrollRef = useRef(false);

  // Effect to setup scrolling and highlight initial year properly
  useEffect(() => {
    setTimeout(() => {
      const employmentContainer = document.getElementById('employment-history-container');
      const otherContainer = document.getElementById('other-positions-container');
  
      if (employmentContainer) {
        employmentContainer.scrollTo({ top: 0, behavior: 'auto' });
      }
  
      if (otherContainer) {
        otherContainer.scrollTo({ top: 0, behavior: 'auto' });
      }
  
      initialScrollRef.current = true;
    }, 200); // Increased timeout to account for rendering lag
  }, []);

  return (
    <div className="bg-white p-4 my-4 rounded border">
      <h2 className="text-xl font-bold mb-4">Select Positions for Generation</h2>
      
      {/* Employment History Section */}
      {sortedEmploymentHistory.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Employment History</h3>
          <div className="flex">
            {/* Year sidebar for employment history */}
            <div className="w-32 pr-4 flex-shrink-0">
              <div className="sticky top-4">
                <h4 className="text-base font-semibold mb-2 text-gray-600">Years</h4>
                <nav className="border-l border-gray-200">
                  <YearSidebar
                    years={groupedEmployment.map(([year]) => year)}
                    prefix="gen-eh-year-"
                    parentId="employment-history-container"
                  />
                </nav>
              </div>
            </div>
            
            {/* Position list with year headers */}
            <div id="employment-history-container" className="flex-1 overflow-y-auto h-[calc(100vh-16rem)]">
              {groupedEmployment.map(([year, positions]) => (
                <div key={year} id={`gen-eh-year-${year}`} className="mb-6">
                  <h4 className="text-md font-medium sticky top-0 bg-white py-2 z-10 border-b shadow-sm">{year}</h4>
                  <div className="mt-6"></div>
                  {positions.map((position) => (
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Other Positions Section */}
      {sortedOtherPositions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mt-6 mb-2">Other Positions</h3>
          <div className="flex">
            {/* Year sidebar for other positions */}
            <div className="w-32 pr-4 flex-shrink-0">
              <div className="sticky top-4">
                <h4 className="text-base font-semibold mb-2 text-gray-600">Years</h4>
                <nav className="border-l border-gray-200">
                  <YearSidebar
                    years={groupedOther.map(([year]) => year)}
                    prefix="gen-other-year-"
                    parentId="other-positions-container"
                  />
                </nav>
              </div>
            </div>
            
            {/* Position list with year headers */}
            <div id="other-positions-container" className="flex-1 overflow-y-auto h-[calc(100vh-16rem)]">
              {groupedOther.map(([year, positions]) => (
                <div key={year} id={`gen-other-year-${year}`} className="mb-6">
                  <h4 className="text-md font-medium sticky top-0 bg-white py-2 z-10 border-b shadow-sm">{year}</h4>
                  <div className="mt-6"></div>
                  {positions.map((position) => (
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Show message if no positions */}
      {sortedEmploymentHistory.length === 0 && sortedOtherPositions.length === 0 && (
        <p className="text-gray-500 py-4">No positions available. Please upload your resume or add positions through the Review Positions page.</p>
      )}
    </div>
  );
}