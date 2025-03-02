// File path: apps/web/app/shared/utils/positionSorting.ts
import { Position } from '@fedjobs/types';

/**
 * Group positions by year
 * @param positions Array of positions to group
 * @returns Array of [year, positions] tuples
 */
export function groupPositionsByYear(
  positions: Position[]
): [number | string, Position[]][] {
  const map = new Map<number | string, Position[]>();
  const currentYear = new Date().getFullYear();
  
  positions.forEach((pos) => {
    const hasValidDate = pos.date.startDate || pos.date.endDate;
    let key: number | string;
    
    if (!hasValidDate) {
      key = "No Date";
    } else if (pos.date.present) {
      // If position is current (present), use current year
      key = currentYear;
    } else {
      const baseDate = pos.date.endDate || pos.date.startDate;
      const year = new Date(baseDate).getFullYear();
      key = isNaN(year) ? "No Date" : year;
    }
    
    
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(pos);
  });
  
  const entries = Array.from(map.entries());
  entries.sort((a, b) => {
    // Sort numeric years descending, "No Date" goes last
    if (typeof a[0] === "number" && typeof b[0] === "string") return -1;
    if (typeof a[0] === "string" && typeof b[0] === "number") return 1;
    if (typeof a[0] === "number" && typeof b[0] === "number") {
      return (b[0] as number) - (a[0] as number);
    }
    return 0;
  });
  return entries;
}

/**
 * Sort positions according to these rules:
 * 1. Positions that end in the present come first
 * 2. Positions with defined start and end dates come next
 * 3. Positions with start dates but no end date come last
 * 4. If two positions have the same date status, the one with clearer information 
 *    (position name, organization) and more accomplishments/activities comes first
 * 
 * @param positions Array of positions to sort
 * @returns Sorted array of positions
 */
export function sortPositions(positions: Position[]): Position[] {
  return [...positions].sort((a, b) => {
    // Check if either position ends in the present
    const aPresent = a.date.present;
    const bPresent = b.date.present;
    
    // Handle positions ending in the present (they come first)
    if (aPresent && !bPresent) return -1;
    if (!aPresent && bPresent) return 1;
    
    // Both positions end in the present or both don't - next check start/end dates
    const aHasEnd = Boolean(a.date.endDate);
    const bHasEnd = Boolean(b.date.endDate);
    const aHasStart = Boolean(a.date.startDate);
    const bHasStart = Boolean(b.date.startDate);
    
    // Positions with both start and end dates come before those with only start date
    if (aHasStart && aHasEnd && !(bHasStart && bHasEnd)) return -1;
    if (bHasStart && bHasEnd && !(aHasStart && aHasEnd)) return 1;
    
    // If both have same date pattern, sort by date recency
    if (aHasEnd && bHasEnd) {
      const aEndDate = new Date(a.date.endDate!);
      const bEndDate = new Date(b.date.endDate!);
      
      // More recent end dates come first
      const dateDiff = bEndDate.getTime() - aEndDate.getTime();
      if (dateDiff !== 0) return dateDiff;
    } else if (aHasStart && bHasStart) {
      const aStartDate = new Date(a.date.startDate!);
      const bStartDate = new Date(b.date.startDate!);
      
      // More recent start dates come first
      const dateDiff = bStartDate.getTime() - aStartDate.getTime();
      if (dateDiff !== 0) return dateDiff;
    }
    
    // If dates are equal, compare the "quality" of the position information
    const aQuality = getPositionQualityScore(a);
    const bQuality = getPositionQualityScore(b);
    
    return bQuality - aQuality;
  });
}

/**
 * Calculate a "quality score" for a position based on:
 * 1. Whether it has a title
 * 2. Whether it has an organization
 * 3. Number of accomplishments and activities
 * 
 * @param position The position to score
 * @returns A numerical score - higher is better
 */
function getPositionQualityScore(position: Position): number {
  let score = 0;
  
  // Add points for having a job title
  if (position.title?.title) {
    score += 5;
    // Add more points for a longer, more descriptive title
    score += Math.min(5, position.title.title.length / 10);
  }
  
  // Add points for organization information
  if (position.organization?.name) {
    score += 5;
    // Add more points for a longer, more descriptive org name
    score += Math.min(5, position.organization.name.length / 10);
  }
  
  // Add points for activities
  if (position.details?.activities) {
    score += position.details.activities.length * 2;
  }
  
  // Add points for accomplishments
  if (position.details?.accomplishments) {
    score += position.details.accomplishments.length * 3;
  }
  
  return score;
}