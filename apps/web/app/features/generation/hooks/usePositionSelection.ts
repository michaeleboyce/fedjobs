import { useState, useCallback, useEffect } from 'react';
import { Position } from '@fedjobs/types';
import { ResumeObject } from '@/app/shared/types/Resume';

export function usePositionSelection(
  employmentHistory: Position[],
  otherPositions: Position[],
  resume?: ResumeObject
) {
  // Position selection state
  const [selectedState, setSelectedState] = useState<Record<string,{ 
    selectedActivities: number[]; 
    selectedAccomplishments: number[] 
  }>>({});
  
  // Generate button enabled state
  const [isGenerateEnabled, setIsGenerateEnabled] = useState(false);
  
  // Track whether any positions are selected
  useEffect(() => {
    const hasSelections = Object.values(selectedState).some(
      (pos) => pos.selectedActivities.length > 0 || pos.selectedAccomplishments.length > 0
    );
    setIsGenerateEnabled(hasSelections);
  }, [selectedState]);
  
  // Handle selection changes
  const handleSelectionChange = useCallback((newSelected: typeof selectedState) => {
    setSelectedState(newSelected);
  }, []);
  
  // Initialize selections from resume if provided
  useEffect(() => {
    if (resume) {
      const initialSelections = resume.positions.reduce((acc, position) => {
        acc[position.positionUuid] = {
          selectedActivities: Array.from({ length: position.details.activities.length }, (_, i) => i),
          selectedAccomplishments: Array.from({ length: position.details.accomplishments.length }, (_, i) => i),
        };
        return acc;
      }, {} as typeof selectedState);
      
      setSelectedState(initialSelections);
    }
  }, [resume]);
  
  // Return selection state and handlers
  return {
    selectedState,
    isGenerateEnabled,
    handleSelectionChange,
  };
}