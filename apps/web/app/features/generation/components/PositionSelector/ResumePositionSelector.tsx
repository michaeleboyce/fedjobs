'use client';

import { useRef } from 'react';
import { ResumeObject } from '@/app/shared/types/Resume';
import { Resume } from '@/app/features/resume/components/ResumeView';
import { cn } from '@/app/shared/utils/classNames';

interface ResumePositionSelectorProps {
  resume: ResumeObject;
  selectedState: Record<string, { selectedActivities: number[]; selectedAccomplishments: number[] }>;
  onSelectionChange: (newState: Record<string, { selectedActivities: number[]; selectedAccomplishments: number[] }>) => void;
  className?: string;
}

/**
 * ResumePositionSelector component
 * Allows users to select specific activities and accomplishments from their resume
 */
export function ResumePositionSelector({
  resume,
  selectedState,
  onSelectionChange,
  className
}: ResumePositionSelectorProps) {
  // Add a ref to track if we're in the middle of updating
  const isUpdatingRef = useRef(false);
  
  // Convert selections to format expected by Resume component
  const positionsData = resume.positions.map(position => {
    const selections = selectedState[position.positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };
    
    return {
      position,
      selectedActivities: selections.selectedActivities,
      selectedAccomplishments: selections.selectedAccomplishments,
    };
  });
  
  // Handle selection changes - prevent infinite loops
  const handleSelectionChange = (selections: { positions: typeof positionsData }) => {
    // Avoid triggering an update if we're already updating
    if (isUpdatingRef.current) return;
    
    // Convert back to our format
    const newState = selections.positions.reduce((acc, item) => {
      acc[item.position.positionUuid] = {
        selectedActivities: item.selectedActivities,
        selectedAccomplishments: item.selectedAccomplishments,
      };
      return acc;
    }, {} as Record<string, { selectedActivities: number[]; selectedAccomplishments: number[] }>);
    
    onSelectionChange(newState);
  };

  return (
    <div className={cn("resume-position-selector", className)}>
      <Resume
        resume={resume}
        onSelectionChange={handleSelectionChange}
        isViewOnly={false}
      />
    </div>
  );
}