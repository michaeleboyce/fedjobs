// File path: apps/web/app/features/positions/hooks/useFetchSimilarPosition.ts
'use client';

import { useState, useEffect } from 'react';
import { Position } from '@fedjobs/types';
import { usePositionsManagement } from './usePositionsManagement';

/**
 * Hook for fetching and managing similar position data
 * @param similarId Position UUID to fetch
 */
export const useFetchSimilarPosition = (similarId: string) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { findPositionByUuid, isPositionLoading } = usePositionsManagement();
  
  // Get position from store instead of direct API call
  const position = findPositionByUuid(similarId);
  
  // Check loading state from store
  const isLoadingPosition = isPositionLoading(similarId);
  
  const toggleExpand = () => {
    setIsExpanded(prev => !prev);
  };
  
  return { 
    position, 
    isLoadingPosition,
    isExpanded,
    toggleExpand
  };
};