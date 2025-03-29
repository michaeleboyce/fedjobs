// File path: apps/web/app/features/generation/hooks/usePositionSelection.ts
import { useEffect, useRef } from 'react';
import { Position } from '@fedjobs/types';
import { ResumeObject } from '@/app/shared/types/Resume';
import { useGenerationManagement } from './useGenerationManagement';
import { PositionSelectionState } from '@fedjobs/types';

/**
 * This hook manages position selection state using the global generation store
 * It has been refactored to use the Zustand store instead of local state
 */
export function usePositionSelection(
  employmentHistory: Position[],
  otherPositions: Position[],
  resume?: ResumeObject
) {
  // Get selection state from the generation store
  const {
    selectedPositions,
    isGenerateEnabled,
    handleSelectionChange,
    initializeFromResume
  } = useGenerationManagement();
  
  // Add this ref to prevent effects from running unnecessarily
  const initializedRef = useRef(false);
  
  // Initialize selections from resume if provided, but only once
  useEffect(() => {
    if (resume && resume.positions && !initializedRef.current) {
      initializedRef.current = true; // Mark as initialized
      
      // Map positions to the format expected by initializeFromResume
      const positionsForInit = resume.positions.map(position => ({
        positionUuid: position.positionUuid,
        details: {
          activities: position.details.activities,
          accomplishments: position.details.accomplishments
        }
      }));
      
      initializeFromResume(positionsForInit);
    }
  }, [resume, initializeFromResume]);
  
  // Return selection state and handlers from the store
  // Define explicit type for the return value to avoid TypeScript complaints
  return {
    selectedState: selectedPositions as Record<string, PositionSelectionState>,
    isGenerateEnabled,
    handleSelectionChange,
  };
}