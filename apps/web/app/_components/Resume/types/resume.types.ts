// File path: apps/web/app/_components/Resume/types/resume.types.ts
import { ResumeObject } from '@/app/_classes/Resume';
import { PositionObject } from '@/app/_classes/Position';

/**
 * Props for the TestResume component
 */
export interface ResumeProps {
  resume: ResumeObject;
  onSelectionChange: (selectedState: SelectionState) => void;
  isViewOnly: boolean;
}

/**
 * Props for the PositionCard component
 */
export interface PositionCardProps {
  position: PositionObject;
  isOpen: boolean;
  isViewOnly: boolean;
  selectedActivities: number[];
  selectedAccomplishments: number[];
  onToggleDetails: () => void;
  onCheckboxChange: (type: "activities" | "accomplishments", idx: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

/**
 * State structure for selections
 */
export interface SelectionState {
  positions: {
    position: PositionObject;
    selectedActivities: number[];
    selectedAccomplishments: number[];
  }[];
} 