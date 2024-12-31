// File path: apps/web/app/_components/Resume/index.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { PositionCard } from './components/PositionCard';
import { usePositionSelections } from './hooks/usePositionSelections';
import { toggleItemInArray, mapSelectionsToPositions } from './utils/selectionUtils';
import { ResumeProps } from './types/resume.types';

/**
 * TestResume Component
 * Displays a resume with selectable positions, activities, and accomplishments
 * 
 * @component
 * @param {ResumeProps} props - Component props
 * @param {ResumeObject} props.resume - Resume data to display
 * @param {Function} props.onSelectionChange - Callback when selections change
 * @param {boolean} props.isViewOnly - Whether the resume is in view-only mode
 */
export const Resume: React.FC<ResumeProps> = ({
  resume,
  onSelectionChange,
  isViewOnly,
}) => {
  // Custom hook to manage position selections
  const [selectedPositions, setSelectedPositions] = usePositionSelections(resume.positions);
  const [openPositionIndexes, setOpenPositionIndexes] = useState<number[]>([]);

  // Notify parent of selection changes
  useEffect(() => {
    const positionsData = mapSelectionsToPositions(resume.positions, selectedPositions);
    onSelectionChange({ positions: positionsData });
  }, [resume.positions, selectedPositions, onSelectionChange]);

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
    
    const position = resume.positions[posIndex];
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
    <div className="bg-gray-100 min-h-screen py-10">
      <div className="container mx-auto px-4">
        {resume.positions.map((position, posIndex) => (
          <PositionCard
            key={posIndex}
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
        ))}
      </div>
    </div>
  );
};

export default Resume;
