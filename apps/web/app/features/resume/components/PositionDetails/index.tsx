// File path: apps/web/app/features/resume/components/PositionDetails/index.tsx
import React from 'react';
import { PositionObject } from '@/app/shared/types/Position';
import { PositionDetailsSection } from './PositionDetailsSection';
/**
 * Props for the PositionDetails component
 */
interface PositionDetailsProps {
  position: PositionObject;
  isViewOnly: boolean;
  selectedActivities: number[];
  selectedAccomplishments: number[];
  onCheckboxChange: (type: "activities" | "accomplishments", idx: number) => void;
}

/**
 * PositionDetails Component
 * Displays the activities and accomplishments for a position with selection controls
 * 
 * @component
 */
export const PositionDetails: React.FC<PositionDetailsProps> = ({
  position,
  isViewOnly,
  selectedActivities,
  selectedAccomplishments,
  onCheckboxChange,
}) => {


  return (
    <div className="card-content mt-4 text-left">
      <PositionDetailsSection
        sectionName='activities'
        details={position.details.activities}
        selectedDetails={selectedActivities}
        onCheckboxChange={onCheckboxChange}
        isViewOnly={isViewOnly}
      />
      <PositionDetailsSection
        sectionName='accomplishments'
        details={position.details.accomplishments}
        selectedDetails={selectedAccomplishments}
        onCheckboxChange={onCheckboxChange}
        isViewOnly={isViewOnly}
      />
    </div>
  );
}; 