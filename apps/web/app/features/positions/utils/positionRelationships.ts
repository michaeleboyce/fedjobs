// File path: apps/web/app/features/positions/utils/positionRelationships.ts
import { Position } from '@fedjobs/types';

/**
 * Updates positions in a collection by applying relationship changes
 * @param positions Array of positions to update
 * @param currentUuid UUID of the current position
 * @param relatedUuid UUID of the related position
 * @param relationshipType Type of relationship to update ('similar', 'approved', 'rejected')
 * @param action Action to perform ('add' or 'remove')
 */
export function updatePositionRelationships(
  positions: Position[],
  currentUuid: string,
  relatedUuid: string,
  relationshipType: 'similar' | 'approved' | 'rejected',
  action: 'add' | 'remove'
): Position[] {
  return positions.map(pos => {
    // Skip positions not involved in this relationship update
    if (pos.positionUuid !== currentUuid && pos.positionUuid !== relatedUuid) {
      return pos;
    }
    
    // For each position involved in the relationship, update its arrays
    const isCurrentPosition = pos.positionUuid === currentUuid;
    const otherUuid = isCurrentPosition ? relatedUuid : currentUuid;
    
    // Create a new position object with updated arrays
    const updatedPos = { ...pos };
    
    if (action === 'add') {
      // Add to the specified relationship array
      if (relationshipType === 'similar') {
        updatedPos.similarPositionUuids = Array.from(
          new Set([...(updatedPos.similarPositionUuids || []), otherUuid])
        );
      } else if (relationshipType === 'approved') {
        updatedPos.approvedSimilarPositionUuids = Array.from(
          new Set([...(updatedPos.approvedSimilarPositionUuids || []), otherUuid])
        );
        // When approving, remove from similar list
        updatedPos.similarPositionUuids = (updatedPos.similarPositionUuids || []).filter(
          id => id !== otherUuid
        );
      } else if (relationshipType === 'rejected') {
        updatedPos.rejectedSimilarPositionUuids = Array.from(
          new Set([...(updatedPos.rejectedSimilarPositionUuids || []), otherUuid])
        );
        // When rejecting, remove from similar list
        updatedPos.similarPositionUuids = (updatedPos.similarPositionUuids || []).filter(
          id => id !== otherUuid
        );
      }
    } else if (action === 'remove') {
      // Remove from the specified relationship array
      if (relationshipType === 'similar') {
        updatedPos.similarPositionUuids = (updatedPos.similarPositionUuids || []).filter(
          id => id !== otherUuid
        );
      } else if (relationshipType === 'approved') {
        updatedPos.approvedSimilarPositionUuids = (updatedPos.approvedSimilarPositionUuids || []).filter(
          id => id !== otherUuid
        );
        // When removing approval, add back to similar list
        updatedPos.similarPositionUuids = Array.from(
          new Set([...(updatedPos.similarPositionUuids || []), otherUuid])
        );
      } else if (relationshipType === 'rejected') {
        updatedPos.rejectedSimilarPositionUuids = (updatedPos.rejectedSimilarPositionUuids || []).filter(
          id => id !== otherUuid
        );
        // When removing rejection, add back to similar list
        updatedPos.similarPositionUuids = Array.from(
          new Set([...(updatedPos.similarPositionUuids || []), otherUuid])
        );
      }
    }
    
    return updatedPos;
  });
}

/**
 * Adds UX enhancements like scrolling to position and highlighting
 */
export function scrollToPosition(uuid: string, highlight: boolean = true): void {
  setTimeout(() => {
    const element = document.getElementById(`position-${uuid}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
      if (highlight) {
        // Add highlight effect
        element.classList.add("highlight-position");
        setTimeout(() => element.classList.remove("highlight-position"), 2000);
      }
    }
  }, 100);
}