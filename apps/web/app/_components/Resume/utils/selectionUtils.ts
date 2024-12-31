// File path: apps/web/app/_components/Resume/utils/selectionUtils.ts
import { PositionObject } from '@/app/_classes/Position';

/**
 * Toggles an item's presence in an array
 * 
 * @param array - Current array of selected indices
 * @param item - Index to toggle
 * @returns New array with item toggled
 */
export const toggleItemInArray = (array: number[], item: number): number[] => {
  return array.includes(item) 
    ? array.filter((i) => i !== item)
    : [...array, item];
};

/**
 * Maps the current selections to a format expected by parent components
 * 
 * @param positions - Array of position objects
 * @param selectedPositions - Current selection state
 * @returns Formatted array of positions with their selections
 */
export const mapSelectionsToPositions = (
  positions: PositionObject[],
  selectedPositions: Record<number, {
    selectedActivities: number[];
    selectedAccomplishments: number[];
  }>
) => {
  return positions.map((position, index) => ({
    position,
    selectedActivities: selectedPositions[index]?.selectedActivities ?? [],
    selectedAccomplishments: selectedPositions[index]?.selectedAccomplishments ?? [],
  }));
}; 