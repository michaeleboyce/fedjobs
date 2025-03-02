import { ResumeObject } from '@/app/shared/types/Resume';
import { Resume } from '@/app/features/resume/components/ResumeView';

interface ResumePositionSelectorProps {
  resume: ResumeObject;
  selectedState: Record<string, { selectedActivities: number[]; selectedAccomplishments: number[] }>;
  onSelectionChange: (newState: typeof selectedState) => void;
}

export function ResumePositionSelector({
  resume,
  selectedState,
  onSelectionChange
}: ResumePositionSelectorProps) {
  // Convert selections to format expected by Resume component
  const positionsData = resume.positions.map(position => {
    const selections = selectedState[position.positionUuid] || {
      selectedActivities: [],
      selectedAccomplishments: [],
    };
    
    return {
      position,
      selectedActivities: selections.selectedActivities,
      selectedAccomplishments: selections.selectedAccomplishments,
    };
  });
  
  // Handle selection changes
  const handleSelectionChange = (selections: { positions: typeof positionsData }) => {
    // Convert back to our format
    const newState = selections.positions.reduce((acc, item) => {
      acc[item.position.positionUuid] = {
        selectedActivities: item.selectedActivities,
        selectedAccomplishments: item.selectedAccomplishments,
      };
      return acc;
    }, {} as typeof selectedState);
    
    onSelectionChange(newState);
  };

  return (
    <Resume
      resume={resume}
      onSelectionChange={handleSelectionChange}
      isViewOnly={false}
    />
  );
}