'use client';

import { useEffect, useRef, useState } from 'react';
import { PositionCard } from '@/app/features/resume/components/PositionCard';
import { usePositionSelections } from '@/app/features/resume/hooks/usePositionSelections';
import { toggleItemInArray, mapSelectionsToPositions } from '@/app/features/resume/utils/selectionUtils';
import { ResumeProps } from '@/app/features/resume/types/resume.types';
import { cn } from '@/app/shared/utils/classNames';
import { Position } from '@fedjobs/types';
import { sortPositions, groupPositionsByYear } from '@/app/shared/utils/positionSorting';
import { YearSidebar } from '@/app/shared/components/YearSidebar';

/**
 * Resume Component
 * Displays a resume with selectable positions, activities, and accomplishments
 */
export const Resume: React.FC<ResumeProps> = ({
  resume,
  onSelectionChange,
  isViewOnly,
  className,
}) => {
  // Custom hook to manage position selections
  const [selectedPositions, setSelectedPositions] = usePositionSelections(resume.positions);
  const [openPositionIndexes, setOpenPositionIndexes] = useState<number[]>([]);

  // Prevent infinite update loops with a ref
  const prevSelectedPositionsRef = useRef<typeof selectedPositions>(null);

  // Sort positions using improved sorting logic
  const sortedPositions = sortPositions(resume.positions);

  // Group positions by year
  const groupedPositions = groupPositionsByYear(sortedPositions);

  // Build a map of position UUIDs to indexes for tracking selections
  const positionIndexMap = sortedPositions.reduce((acc, pos, idx) => {
    acc[pos.positionUuid] = idx;
    return acc;
  }, {} as Record<string, number>);

  // Notify parent of selection changes
  useEffect(() => {
    // Skip the initial render or if we just received props
    if (!prevSelectedPositionsRef.current) {
      prevSelectedPositionsRef.current = selectedPositions;
      return;
    }
    
    // Only update if our internal state actually changed
    if (JSON.stringify(prevSelectedPositionsRef.current) !== JSON.stringify(selectedPositions)) {
      const positionsData = mapSelectionsToPositions(sortedPositions, selectedPositions);
      onSelectionChange({ positions: positionsData });
      prevSelectedPositionsRef.current = selectedPositions;
    }
  }, [sortedPositions, selectedPositions, onSelectionChange]);

  /**
   * Toggle position details expansion
   */
  const toggleDetails = (posIndex: number) => {
    setOpenPositionIndexes(prev =>
      prev.includes(posIndex)
        ? prev.filter(idx => idx !== posIndex)
        : [...prev, posIndex]
    );
  };

  /**
   * Handle checkbox changes for activities and accomplishments
   */
  const handleCheckboxChange = (
    posIndex: number,
    type: "activities" | "accomplishments",
    itemIndex: number
  ) => {
    if (isViewOnly) return;
    
    setSelectedPositions(prev => {
      const current = prev[posIndex] || {
        selectedActivities: [],
        selectedAccomplishments: [],
      };

      return {
        ...prev,
        [posIndex]: {
          ...current,
          [type === "activities" ? "selectedActivities" : "selectedAccomplishments"]: 
            toggleItemInArray(
              type === "activities" ? current.selectedActivities : current.selectedAccomplishments,
              itemIndex
            )
        }
      };
    });
  };

  /**
   * SELECT ALL items in a position
   */
  const handleSelectAll = (posIndex: number) => {
    if (isViewOnly) return;
    
    const position = sortedPositions[posIndex];
    setSelectedPositions(prev => ({
      ...prev,
      [posIndex]: {
        selectedActivities: Array.from({ length: position.details.activities.length }, (_, i) => i),
        selectedAccomplishments: Array.from({ length: position.details.accomplishments.length }, (_, i) => i),
      }
    }));
  };

  /**
   * CLEAR ALL items in a position
   */
  const handleClearAll = (posIndex: number) => {
    if (isViewOnly) return;
    
    setSelectedPositions(prev => ({
      ...prev,
      [posIndex]: { selectedActivities: [], selectedAccomplishments: [] }
    }));
  };

  return (
    <div className={cn("bg-gray-100 min-h-screen py-10", className)}>
      <div className="container mx-auto px-4">
        <div className="flex">
          {/* Year sidebar */}
          <div className="w-32 pr-4 flex-shrink-0">
            <div className="sticky top-4">
              <h4 className="text-base font-semibold mb-2 text-gray-600">Resume Years</h4>
              <nav className="border-l border-gray-200">
                <YearSidebar
                  years={groupedPositions.map(([year]) => year)}
                  prefix="resume-year-"
                  parentId="resume-positions-container"
                />
              </nav>
            </div>
          </div>
          
          {/* Positions grouped by year */}
          <div id="resume-positions-container" className="flex-1 overflow-y-auto h-[calc(100vh-10rem)]">
            {groupedPositions.map(([year, positions]) => (
              <div key={year} id={`resume-year-${year}`} className="mb-6">
                <h3 className="text-lg font-semibold sticky top-0 bg-gray-100 py-2 z-10 border-b border-gray-200 shadow-sm">{year}</h3>
                <div className="mt-6"></div>
                {positions.map((position) => {
                  const posIndex = positionIndexMap[position.positionUuid];
                  return (
                    <PositionCard
                      key={position.positionUuid}
                      position={position}
                      isOpen={openPositionIndexes.includes(posIndex)}
                      isViewOnly={isViewOnly}
                      selectedActivities={selectedPositions[posIndex]?.selectedActivities ?? []}
                      selectedAccomplishments={selectedPositions[posIndex]?.selectedAccomplishments ?? []}
                      onToggleDetails={() => toggleDetails(posIndex)}
                      onCheckboxChange={(type, idx) => handleCheckboxChange(posIndex, type, idx)}
                      onSelectAll={() => handleSelectAll(posIndex)}
                      onClearAll={() => handleClearAll(posIndex)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resume;
