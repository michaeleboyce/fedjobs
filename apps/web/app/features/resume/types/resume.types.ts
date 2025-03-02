import { ResumeObject } from '@/app/shared/types/Resume';
import { PositionObject } from '@/app/shared/types/Position';

/**
 * Props for the Resume component
 */
export interface ResumeProps {
  resume: ResumeObject;
  onSelectionChange: (selectedState: SelectionState) => void;
  isViewOnly: boolean;
  className?: string;
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
  actions?: React.ReactNode; 
  children?: React.ReactNode;
  className?: string;
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