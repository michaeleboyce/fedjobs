// File path: apps/web/app/_components/Resume/components/PositionCard/index.tsx
import React from 'react';
import { PositionCardProps } from '../../types/resume.types';
import { SelectionControls } from '../SelectionControls';
import { DetailsToggle } from '../DetailsToggle';
import { PositionDetails } from '../PositionDetails';

/**
 * PositionCard Component
 * Displays a single position with its details and selection controls
 * 
 * @component
 */
export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  isOpen,
  isViewOnly,
  selectedActivities,
  selectedAccomplishments,
  onToggleDetails,
  onCheckboxChange,
  onSelectAll,
  onClearAll,
}) => {
  // Calculate selection stats
  const totalActivities = position.details.activities.length;
  const totalAccomplishments = position.details.accomplishments.length;
  const totalItems = totalActivities + totalAccomplishments;
  const selectedCount = selectedActivities.length + selectedAccomplishments.length;
  const isAllSelected = selectedCount === totalItems && totalItems > 0;

  return (
    <div className="card shadow-lg rounded-lg overflow-hidden mb-4">
      <div className="card-body bg-white p-6 text-center">
        <h4 className="card-title text-xl font-bold text-gray-800">
          {position.title.title} at {position.organization.name}
        </h4>
        <p className="text-gray-600">
          Date: {position.date.startDate} - {position.date.present ? "Present" : position.date.endDate}
        </p>

        <SelectionControls
          isViewOnly={isViewOnly}
          totalItems={totalItems}
          isAllSelected={isAllSelected}
          selectedCount={selectedCount}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
        />

        <DetailsToggle 
          isOpen={isOpen}
          onToggle={onToggleDetails}
        />

        {isOpen && (
          <PositionDetails
            position={position}
            isViewOnly={isViewOnly}
            selectedActivities={selectedActivities}
            selectedAccomplishments={selectedAccomplishments}
            onCheckboxChange={onCheckboxChange}
          />
        )}
      </div>
    </div>
  );
}; 