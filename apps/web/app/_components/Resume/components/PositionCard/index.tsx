// File path: apps/web/app/_components/Resume/components/PositionCard/index.tsx

import React from "react";
import { Position } from "@fedjobs/types";
import { SelectionControls } from "../SelectionControls";
import { DetailsToggle } from "../DetailsToggle";
import { PositionDetails } from "../PositionDetails";
// File path: apps/web/app/_components/Resume/components/PositionCard/index.tsx

interface PositionCardProps {
  id?: string; // New prop
  position: Position;
  isOpen: boolean;
  isViewOnly: boolean;
  selectedActivities?: number[];
  selectedAccomplishments?: number[];
  onToggleDetails: () => void;
  onCheckboxChange?: (
    type: "activities" | "accomplishments",
    idx: number
  ) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  similarPositions?: Position[];
}

export const PositionCard: React.FC<PositionCardProps> = ({
  id,
  position,
  isOpen,
  isViewOnly,
  selectedActivities = [],
  selectedAccomplishments = [],
  onToggleDetails,
  onCheckboxChange,
  onSelectAll,
  onClearAll,
  actions,
  children,
  similarPositions,
}) => {
  // Only calculate selection stats if selection props are provided
  // Calculate if selection controls should be shown
  const hasSelection = onCheckboxChange && onSelectAll && onClearAll;

  const totalActivities = hasSelection ? position.details.activities.length : 0;
  const totalAccomplishments = hasSelection
    ? position.details.accomplishments.length
    : 0;
  const totalItems = totalActivities + totalAccomplishments;
  const selectedCount =
    selectedActivities.length + selectedAccomplishments.length;
  // Ensure isAllSelected is always a boolean
  const isAllSelected = hasSelection
    ? selectedCount === totalItems && totalItems > 0
    : false;
  return (
    <div id={id} className="card shadow-lg rounded-lg overflow-hidden mb-4">
      <div className="card-body bg-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="card-title text-xl font-bold text-gray-800">
              {position.title.title} at {position.organization.name}
            </h4>
            <p className="text-gray-600">
              Date: {position.date.startDate} -{" "}
              {position.date.present ? "Present" : position.date.endDate}
            </p>
            {/* Display similar positions note when collapsed */}
            {!isOpen && similarPositions && similarPositions.length > 0 && (
              <div className="mt-4 p-2 bg-blue-50 text-blue-800 rounded">
                There {similarPositions.length === 1 ? "is" : "are"}{" "}
                {similarPositions.length} similar position
                {similarPositions.length === 1 ? "" : "s"} available.
              </div>
            )}
          </div>
          <DetailsToggle isOpen={isOpen} onToggle={onToggleDetails} />
        </div>

        {hasSelection && (
          <SelectionControls
            isViewOnly={isViewOnly}
            totalItems={totalItems}
            isAllSelected={isAllSelected}
            selectedCount={selectedCount}
            onSelectAll={onSelectAll!}
            onClearAll={onClearAll!}
          />
        )}

        {/* Custom Actions */}
        {actions && (
          <div className="mt-4 flex space-x-2">
            {" "}
            {/* Added flex and spacing */}
            {actions}
          </div>
        )}

        {isOpen && (
          <>
            {hasSelection ? (
              <PositionDetails
                position={position}
                isViewOnly={isViewOnly}
                selectedActivities={selectedActivities}
                selectedAccomplishments={selectedAccomplishments}
                onCheckboxChange={onCheckboxChange}
              />
            ) : (
              <PositionDetails
                position={position}
                isViewOnly={isViewOnly}
                // Pass empty arrays or handle absence of selection as needed
                selectedActivities={[]}
                selectedAccomplishments={[]}
                onCheckboxChange={() => {}}
              />
            )}
            {children}
          </>
        )}
      </div>
    </div>
  );
};
