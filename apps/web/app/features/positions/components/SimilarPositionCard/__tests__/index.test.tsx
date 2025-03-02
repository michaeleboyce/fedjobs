// File path: apps/web/app/features/positions/components/SimilarPositionCard/__tests__/index.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimilarPositionCard } from '../index';
import { useFetchSimilarPosition } from '@/app/features/positions/hooks/useFetchSimilarPosition';
import { usePositionsManagement } from '@/app/features/positions/hooks/usePositionsManagement';

// Mock the hooks
vi.mock('@/app/features/positions/hooks/useFetchSimilarPosition', () => ({
  useFetchSimilarPosition: vi.fn()
}));

vi.mock('@/app/features/positions/hooks/usePositionsManagement', () => ({
  usePositionsManagement: vi.fn()
}));

describe('SimilarPositionCard', () => {
  // Mock position data
  const mockCurrentPosition = {
    positionUuid: 'current1',
    title: { title: 'Current Position' },
    organization: { name: 'Current Org' },
    date: { startDate: '01/01/2020', endDate: '12/31/2020', present: false },
    details: { activities: [], accomplishments: [] },
    similarPositionUuids: ['similar1'],
    approvedSimilarPositionUuids: [],
    rejectedSimilarPositionUuids: [],
  };

  const mockSimilarPosition = {
    positionUuid: 'similar1',
    title: { title: 'Similar Position' },
    organization: { name: 'Similar Org' },
    date: { startDate: '02/01/2020', endDate: '12/31/2021', present: false },
    details: { 
      activities: ['Activity 1', 'Activity 2'], 
      accomplishments: ['Accomplishment 1'] 
    },
    similarPositionUuids: ['current1'],
    approvedSimilarPositionUuids: [],
    rejectedSimilarPositionUuids: [],
  };

  const mockProps = {
    similarId: 'similar1',
    currentPosition: mockCurrentPosition,
    isEmploymentHistory: true,
    isGenerationView: false,
    onViewOriginal: vi.fn(),
    isLoading: false,
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onRemove: vi.fn(),
  };

  // Default mock implementations
  beforeEach(() => {
    vi.resetAllMocks();
    
    (useFetchSimilarPosition as any).mockReturnValue({
      position: mockSimilarPosition,
      isLoadingPosition: false,
      isExpanded: false,
      toggleExpand: vi.fn()
    });
    
    (usePositionsManagement as any).mockReturnValue({
      employmentHistory: [mockCurrentPosition],
    });
  });

  it('should render the similar position details', () => {
    // Render the component
    render(<SimilarPositionCard {...mockProps} />);
    
    // Check that the position title is displayed
    expect(screen.getByText('Similar Position')).toBeInTheDocument();
    
    // Check that the organization is displayed
    expect(screen.getByText('Similar Org')).toBeInTheDocument();
  });

  it('should render loading skeleton when position is loading', () => {
    // Mock loading state
    (useFetchSimilarPosition as any).mockReturnValue({
      position: null,
      isLoadingPosition: true,
      isExpanded: false,
      toggleExpand: vi.fn()
    });
    
    // Render the component
    render(<SimilarPositionCard {...mockProps} />);
    
    // The LoadingSkeleton should be rendered
    // (This test would be better with a specific test ID or class for the skeleton)
    expect(screen.queryByText('Similar Position')).not.toBeInTheDocument();
  });

  it('should call onApprove when approve button is clicked', () => {
    // Render the component
    render(<SimilarPositionCard {...mockProps} />);
    
    // Find and click the approve button
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    
    // Check that onApprove was called
    expect(mockProps.onApprove).toHaveBeenCalledTimes(1);
  });

  it('should call onReject when reject button is clicked', () => {
    // Render the component
    render(<SimilarPositionCard {...mockProps} />);
    
    // Find and click the reject button
    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);
    
    // Check that onReject was called
    expect(mockProps.onReject).toHaveBeenCalledTimes(1);
  });

  it('should toggle expanded state when toggle button is clicked', () => {
    const toggleExpand = vi.fn();
    
    // Mock with a toggleExpand function
    (useFetchSimilarPosition as any).mockReturnValue({
      position: mockSimilarPosition,
      isLoadingPosition: false,
      isExpanded: false,
      toggleExpand
    });
    
    // Render the component
    render(<SimilarPositionCard {...mockProps} />);
    
    // Find and click the expand/collapse button
    const toggleButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(toggleButton);
    
    // Check that toggleExpand was called
    expect(toggleExpand).toHaveBeenCalledTimes(1);
  });

  it('should not show action buttons in generation view', () => {
    // Render with isGenerationView=true
    render(<SimilarPositionCard {...mockProps} isGenerationView={true} />);
    
    // Action buttons should not be visible
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
  });
});