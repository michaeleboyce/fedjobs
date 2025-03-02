import { Position } from '@fedjobs/types';
import { ResumeObject } from '@/app/shared/types/Resume';
import { ResumePositionSelector } from './ResumePositionSelector';
import { PositionListSelector } from './PositionListSelector';
import { PositionSelectionState } from "@/app/features/generation/types"

interface PositionSelectorProps {
  resume?: ResumeObject;
  employmentHistory: Position[];
  otherPositions: Position[];
  selectedState: PositionSelectionState; //PositionSelectionState preserves the activities and accomplishments bifurcation.
  onSelectionChange: (newState: PositionSelectionState) => void;
}

export function PositionSelector({
  resume,
  employmentHistory,
  otherPositions,
  selectedState,
  onSelectionChange
}: PositionSelectorProps) {
  // Render Resume or Position selector based on if resume is provided
  if (resume) {
    return (
      <ResumePositionSelector
        resume={resume}
        selectedState={selectedState}
        onSelectionChange={onSelectionChange}
      />
    );
  }
  
  return (
    <PositionListSelector
      employmentHistory={employmentHistory}
      otherPositions={otherPositions}
      selectedState={selectedState}
      onSelectionChange={onSelectionChange}
    />
  );
}