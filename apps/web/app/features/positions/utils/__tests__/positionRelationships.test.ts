import { describe, it, expect } from 'vitest';
import { updatePositionRelationships } from '../positionRelationships';
import { Position } from '@fedjobs/types';

describe('updatePositionRelationships', () => {
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
    const pos1 = createMockPosition('pos1');
    const pos2 = createMockPosition('pos2');
    const positions = [pos1, pos2];
    
    const result = updatePositionRelationships(positions, 'pos1', 'pos2', 'similar', 'add');
    
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    expect(updatedPos1?.similarPositionUuids).toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).toContain('pos1');
  });

  it('should add a position to approved and remove from similar', () => {
    const pos1 = createMockPosition('pos1');
    pos1.similarPositionUuids = ['pos2'];
    
    const pos2 = createMockPosition('pos2');
    pos2.similarPositionUuids = ['pos1'];
    
    const positions = [pos1, pos2];
    
    const result = updatePositionRelationships(positions, 'pos1', 'pos2', 'approved', 'add');
    
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    expect(updatedPos1?.approvedSimilarPositionUuids).toContain('pos2');
    expect(updatedPos2?.approvedSimilarPositionUuids).toContain('pos1');
    expect(updatedPos1?.similarPositionUuids).not.toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).not.toContain('pos1');
  });

  it('should remove a position from approved and add back to similar', () => {
    const pos1 = createMockPosition('pos1');
    pos1.approvedSimilarPositionUuids = ['pos2'];
    
    const pos2 = createMockPosition('pos2');
    pos2.approvedSimilarPositionUuids = ['pos1'];
    
    const positions = [pos1, pos2];
    
    const result = updatePositionRelationships(positions, 'pos1', 'pos2', 'approved', 'remove');
    
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    expect(updatedPos1?.approvedSimilarPositionUuids).not.toContain('pos2');
    expect(updatedPos2?.approvedSimilarPositionUuids).not.toContain('pos1');
    expect(updatedPos1?.similarPositionUuids).toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).toContain('pos1');
  });

  it('should handle rejected relationships correctly', () => {
    const pos1 = createMockPosition('pos1');
    pos1.similarPositionUuids = ['pos2'];
    
    const pos2 = createMockPosition('pos2');
    pos2.similarPositionUuids = ['pos1'];
    
    const positions = [pos1, pos2];
    
    const result = updatePositionRelationships(positions, 'pos1', 'pos2', 'rejected', 'add');
    
    const updatedPos1 = result.find(p => p.positionUuid === 'pos1');
    const updatedPos2 = result.find(p => p.positionUuid === 'pos2');
    
    expect(updatedPos1?.rejectedSimilarPositionUuids).toContain('pos2');
    expect(updatedPos2?.rejectedSimilarPositionUuids).toContain('pos1');
    expect(updatedPos1?.similarPositionUuids).not.toContain('pos2');
    expect(updatedPos2?.similarPositionUuids).not.toContain('pos1');
  });

  it('should not modify positions not involved in the relationship', () => {
    const pos1 = createMockPosition('pos1');
    const pos2 = createMockPosition('pos2');
    const pos3 = createMockPosition('pos3');
    const positions = [pos1, pos2, pos3];
    
    const result = updatePositionRelationships(positions, 'pos1', 'pos2', 'similar', 'add');
    
    const updatedPos3 = result.find(p => p.positionUuid === 'pos3');
    expect(updatedPos3).toEqual(pos3);
  });
});
