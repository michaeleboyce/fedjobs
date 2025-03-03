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

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const isPositionLoading = (uuid: string): boolean => loadingPositions.has(uuid);

  const findPositionByUuid = (uuid: string): Position | undefined => {
    return [...employmentHistory, ...otherPositions].find(
      (pos) => pos.positionUuid === uuid
    );
  };

  return {
    employmentHistory,
    otherPositions,
    isLoading,
    error,
    addToEmploymentHistory,
    removeFromEmploymentHistory,
    rejectPosition,
    updatePosition,
    approveSimilar,
    rejectSimilar,
    removeApprovedSimilar,
    removeRejectedSimilar,
    isPositionLoading,
    findPositionByUuid,
    refetchPositions: fetchPositions,
  };
}
