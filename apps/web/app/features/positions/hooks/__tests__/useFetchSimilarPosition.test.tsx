// File path: apps/web/app/features/positions/hooks/__tests__/useFetchSimilarPosition.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFetchSimilarPosition } from '../useFetchSimilarPosition';
import { usePositionsManagement } from '../usePositionsManagement';

// Mock the usePositionsManagement hook
vi.mock('../usePositionsManagement', () => ({
  usePositionsManagement: vi.fn()
}));

describe('useFetchSimilarPosition', () => {
  // Mock position data
  const mockPosition = {
    positionUuid: 'pos1',
    title: { title: 'Test Position' },
    organization: { name: 'Test Org' },
    date: { startDate: '01/01/2020', endDate: '12/31/2020', present: false },
    details: { 
      activities: ['Activity 1', 'Activity 2'], 
      accomplishments: ['Accomplishment 1'] 
    },
    similarPositionUuids: [],
    approvedSimilarPositionUuids: [],
    rejectedSimilarPositionUuids: [],
  };

  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mock implementation
    (usePositionsManagement as any).mockReturnValue({
      findPositionByUuid: vi.fn().mockReturnValue(mockPosition),
      isPositionLoading: vi.fn().mockReturnValue(false)
    });
  });

  it('should fetch and return a position by UUID', () => {
    // Render the hook with a position UUID
    const { result } = renderHook(() => useFetchSimilarPosition('pos1'));
    
    // Check that findPositionByUuid was called with the right UUID
    expect(usePositionsManagement().findPositionByUuid).toHaveBeenCalledWith('pos1');
    
    // Check that the hook returns the expected position and state
    expect(result.current.position).toEqual(mockPosition);
    expect(result.current.isLoadingPosition).toBe(false);
    expect(result.current.isExpanded).toBe(false);
  });

  it('should handle loading state correctly', () => {
    // Mock isPositionLoading to return true
    (usePositionsManagement as any).mockReturnValue({
      findPositionByUuid: vi.fn().mockReturnValue(mockPosition),
      isPositionLoading: vi.fn().mockReturnValue(true)
    });
    
    // Render the hook
    const { result } = renderHook(() => useFetchSimilarPosition('pos1'));
    
    // Check loading state is passed through
    expect(result.current.isLoadingPosition).toBe(true);
  });

  it('should toggle expanded state', () => {
    // Render the hook
    const { result } = renderHook(() => useFetchSimilarPosition('pos1'));
    
    // Initially not expanded
    expect(result.current.isExpanded).toBe(false);
    
    // Toggle the expanded state
    act(() => {
      result.current.toggleExpand();
    });
    
    // Now it should be expanded
    expect(result.current.isExpanded).toBe(true);
    
    // Toggle again
    act(() => {
      result.current.toggleExpand();
    });
    
    // Now it should be collapsed again
    expect(result.current.isExpanded).toBe(false);
  });

  it('should handle position not found', () => {
    // Mock findPositionByUuid to return null (position not found)
    (usePositionsManagement as any).mockReturnValue({
      findPositionByUuid: vi.fn().mockReturnValue(null),
      isPositionLoading: vi.fn().mockReturnValue(false)
    });
    
    // Render the hook
    const { result } = renderHook(() => useFetchSimilarPosition('nonexistent'));
    
    // Position should be null
    expect(result.current.position).toBeNull();
  });
});