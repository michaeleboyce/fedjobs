// File path: apps/web/app/features/resume/hooks/usePositionSelections.ts
import { useState, useEffect } from 'react';
import { PositionObject } from '@/app/shared/types/Position';

/**
 * Custom hook to manage position selections
 * 
 * @param positions - Array of positions to track selections for
 * @returns Tuple of selections state and setter
 */
export const usePositionSelections = (positions: PositionObject[]) => {
  // State to track selections for each position
  const [selectedPositions, setSelectedPositions] = useState<{
    [posIndex: number]: {
      selectedActivities: number[];
      selectedAccomplishments: number[];
    };
  }>({});

  // Initialize empty selections when positions change
  useEffect(() => {
    const initialState = positions.reduce((acc, _, index) => ({
      ...acc,
      [index]: {
        selectedActivities: [],
        selectedAccomplishments: [],
      },
    }), {});
    setSelectedPositions(initialState);
  }, [positions]);

  return [selectedPositions, setSelectedPositions] as const;
}; 