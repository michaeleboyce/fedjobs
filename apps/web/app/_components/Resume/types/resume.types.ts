// File path: apps/web/app/_components/Resume/types/resume.types.ts
import { ResumeObject } from '@/app/shared/types/Resume';
import { PositionObject } from '@/app/shared/types/Position';

/**
 * Props for the TestResume component
 */
export interface ResumeProps {
  resume: ResumeObject;
  onSelectionChange: (selectedState: SelectionState) => void;
  isViewOnly: boolean;
}

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
  actions?: React.ReactNode; 
  children?: React.ReactNode; 
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