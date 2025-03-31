// File path: apps/web/app/features/positions/utils/positionRelationships.ts
import { Position } from '@fedjobs/types';

export function updatePositionRelationships(
  positions: Position[],
  currentUuid: string,
  relatedUuid: string,
  relationshipType: 'similar' | 'approved' | 'rejected',
  action: 'add' | 'remove'
): Position[] {
  return positions.map(pos => {
    if (pos.positionUuid !== currentUuid && pos.positionUuid !== relatedUuid) {
      return pos;
    }
    const isCurrentPosition = pos.positionUuid === currentUuid;
    const otherUuid = isCurrentPosition ? relatedUuid : currentUuid;
    const updatedPos = { ...pos };

    if (action === 'add') {
      if (relationshipType === 'similar') {
        updatedPos.similarPositionUuids = Array.from(new Set([...(updatedPos.similarPositionUuids || []), otherUuid]));
      } else if (relationshipType === 'approved') {
        updatedPos.approvedSimilarPositionUuids = Array.from(new Set([...(updatedPos.approvedSimilarPositionUuids || []), otherUuid]));
        updatedPos.similarPositionUuids = (updatedPos.similarPositionUuids || []).filter(id => id !== otherUuid);
      } else if (relationshipType === 'rejected') {
        updatedPos.rejectedSimilarPositionUuids = Array.from(new Set([...(updatedPos.rejectedSimilarPositionUuids || []), otherUuid]));
        updatedPos.similarPositionUuids = (updatedPos.similarPositionUuids || []).filter(id => id !== otherUuid);
      }
    } else if (action === 'remove') {
      if (relationshipType === 'similar') {
        updatedPos.similarPositionUuids = (updatedPos.similarPositionUuids || []).filter(id => id !== otherUuid);
      } else if (relationshipType === 'approved') {
        updatedPos.approvedSimilarPositionUuids = (updatedPos.approvedSimilarPositionUuids || []).filter(id => id !== otherUuid);
        updatedPos.similarPositionUuids = Array.from(new Set([...(updatedPos.similarPositionUuids || []), otherUuid]));
      } else if (relationshipType === 'rejected') {
        updatedPos.rejectedSimilarPositionUuids = (updatedPos.rejectedSimilarPositionUuids || []).filter(id => id !== otherUuid);
        updatedPos.similarPositionUuids = Array.from(new Set([...(updatedPos.similarPositionUuids || []), otherUuid]));
      }
    }
    
    return updatedPos;
  });
}

export function scrollToPosition(uuid: string, highlight: boolean = true): void {
  setTimeout(() => {
    const element = document.getElementById(`position-${uuid}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      if (highlight) {
        element.classList.add("highlight-position");
        setTimeout(() => element.classList.remove("highlight-position"), 2000);
      }
    }
  }, 100);
}
