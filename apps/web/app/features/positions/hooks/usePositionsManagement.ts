'use client';

import { useEffect } from 'react';
import { usePositionsStore } from '@/app/store';
import { Position } from '@fedjobs/types';

export function usePositionsManagement() {
  const {
    employmentHistory,
    otherPositions,
    loadingPositions,
    isLoading,
    error,
    fetchPositions,
    addToEmploymentHistory,
    removeFromEmploymentHistory,
    rejectPosition,
    updatePosition,
    approveSimilar,
    rejectSimilar,
    removeApprovedSimilar,
    removeRejectedSimilar,
  } = usePositionsStore();

  // Fetch positions on component mount
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // Check if a position is in the loading state
  const isPositionLoading = (uuid: string): boolean => {
    return loadingPositions.has(uuid);
  };

  // Find a position by UUID in all collections
  const findPositionByUuid = (uuid: string): Position | undefined => {
    return [...employmentHistory, ...otherPositions].find(
      (pos) => pos.positionUuid === uuid
    );
  };

  return {
    // State
    employmentHistory,
    otherPositions,
    isLoading,
    error,
    
    // Actions
    addToEmploymentHistory,
    removeFromEmploymentHistory,
    rejectPosition,
    updatePosition,
    approveSimilar,
    rejectSimilar,
    removeApprovedSimilar,
    removeRejectedSimilar,
    
    // Helper functions
    isPositionLoading,
    findPositionByUuid,
    
    // Fetch/refresh data
    refetchPositions: fetchPositions,
  };
}