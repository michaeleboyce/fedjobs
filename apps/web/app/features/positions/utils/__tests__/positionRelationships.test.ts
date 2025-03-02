// File path: apps/web/app/features/positions/utils/__tests__/positionRelationships.test.ts
import { describe, it, expect } from 'vitest';
import { updatePositionRelationships } from '../positionRelationships';
import { Position } from '@fedjobs/types';

describe('updatePositionRelationships', () => {
  // Mock basic position data
  const createMockPosition = (id: string): Position => ({
    positionUuid: id,
    title: { title: `Position ${id}` },
    organization: { name: 'Test Org' },
    date: { startDate: '01/01/2020', endDate: '12/31/2020', present: false },
    details: { activities: [], accomplishments: [] },
    similarPositionUuids: [],
    approvedSimilarPositionUuids: [],
    rejectedSimilarPositionUuids: [],
  });

  it('should add a position to the similar relationships array', () => {
    // Arrange
    const pos1 = createMockPosition('pos1');
    const pos2 = createMockPosition('pos2');
    const positions = [pos1, pos2];
    
    // Act
    const result = updatePositionRelationships(
      positions, 
      'pos1', 
      'pos2', 
      'similar', 
      'add'
    );
    
    // Assert
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    expect(updatedPos1?.similarPositionUuids).toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).toContain('pos1');
  });

  it('should add a position to approved and remove from similar', () => {
    // Arrange
    const pos1 = createMockPosition('pos1');
    pos1.similarPositionUuids = ['pos2'];
    
    const pos2 = createMockPosition('pos2');
    pos2.similarPositionUuids = ['pos1'];
    
    const positions = [pos1, pos2];
    
    // Act
    const result = updatePositionRelationships(
      positions, 
      'pos1', 
      'pos2', 
      'approved', 
      'add'
    );
    
    // Assert
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    // Should be added to approved
    expect(updatedPos1?.approvedSimilarPositionUuids).toContain('pos2');
    expect(updatedPos2?.approvedSimilarPositionUuids).toContain('pos1');
    
    // Should be removed from similar
    expect(updatedPos1?.similarPositionUuids).not.toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).not.toContain('pos1');
  });

  it('should remove a position from approved and add back to similar', () => {
    // Arrange
    const pos1 = createMockPosition('pos1');
    pos1.approvedSimilarPositionUuids = ['pos2'];
    
    const pos2 = createMockPosition('pos2');
    pos2.approvedSimilarPositionUuids = ['pos1'];
    
    const positions = [pos1, pos2];
    
    // Act
    const result = updatePositionRelationships(
      positions, 
      'pos1', 
      'pos2', 
      'approved', 
      'remove'
    );
    
    // Assert
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    // Should be removed from approved
    expect(updatedPos1?.approvedSimilarPositionUuids).not.toContain('pos2');
    expect(updatedPos2?.approvedSimilarPositionUuids).not.toContain('pos1');
    
    // Should be added back to similar
    expect(updatedPos1?.similarPositionUuids).toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).toContain('pos1');
  });

  it('should handle rejected relationships correctly', () => {
    // Arrange
    const pos1 = createMockPosition('pos1');
    pos1.similarPositionUuids = ['pos2'];
    
    const pos2 = createMockPosition('pos2');
    pos2.similarPositionUuids = ['pos1'];
    
    const positions = [pos1, pos2];
    
    // Act
    const result = updatePositionRelationships(
      positions, 
      'pos1', 
      'pos2', 
      'rejected', 
      'add'
    );
    
    // Assert
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    // Should be added to rejected
    expect(updatedPos1?.rejectedSimilarPositionUuids).toContain('pos2');
    expect(updatedPos2?.rejectedSimilarPositionUuids).toContain('pos1');
    
    // Should be removed from similar
    expect(updatedPos1?.similarPositionUuids).not.toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).not.toContain('pos1');
  });

  it('should not modify positions not involved in the relationship', () => {
    // Arrange
    const pos1 = createMockPosition('pos1');
    const pos2 = createMockPosition('pos2');
    const pos3 = createMockPosition('pos3'); // Not part of the relationship
    const positions = [pos1, pos2, pos3];
    
    // Act
    const result = updatePositionRelationships(
      positions, 
      'pos1', 
      'pos2', 
      'similar', 
      'add'
    );
    
    // Assert
    const updatedPos3 = result.find(p => p.positionUuid === 'pos3');
    
    // Original pos3 should be unchanged
    expect(updatedPos3).toEqual(pos3);
  });
});