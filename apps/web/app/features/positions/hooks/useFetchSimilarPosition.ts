// File path: apps/web/app/features/positions/hooks/useFetchSimilarPosition.ts
'use client';

import { useState } from 'react';
import { usePositionsManagement } from './usePositionsManagement';

export const useFetchSimilarPosition = (similarId: string) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { findPositionByUuid, isPositionLoading } = usePositionsManagement();
  
  const position = findPositionByUuid(similarId);
  const isLoadingPosition = isPositionLoading(similarId);
  
  const toggleExpand = () => setIsExpanded(prev => !prev);
  
  return { 
    position, 
    isLoadingPosition,
    isExpanded,
    toggleExpand
  };
};
