'use client';

import React from "react";
import { Position } from "@fedjobs/types";
import { SelectionControls } from "../SelectionControls";
import { DetailsToggle } from "../DetailsToggle";
import { PositionDetails } from "../PositionDetails";
import Card from '@/app/shared/components/ui/Card';
import { cn } from "@/app/shared/utils/classNames";

interface PositionCardProps {
  id?: string;
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
  className?: string;
}

/**
 * PositionCard component displays a job position with selectable activities and accomplishments
 */
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
  className,
}) => {
  // Calculate if selection controls should be shown
  const hasSelection = onCheckboxChange && onSelectAll && onClearAll;

  const totalActivities = hasSelection ? position.details.activities.length : 0;
  const totalAccomplishments = hasSelection
    ? position.details.accomplishments.length
    : 0;
  const totalItems = totalActivities + totalAccomplishments;
  const selectedCount =
    selectedActivities.length + selectedAccomplishments.length;
  const isAllSelected = hasSelection
    ? selectedCount === totalItems && totalItems > 0
    : false;

  return (
    <div 
      id={id} 
      className={cn("mb-4 overflow-hidden", className)}
      data-position-element="true"
    >
      <Card
        className={cn("overflow-hidden")}
        elevated
      >
        <Card.Header>
          <div>
            <h4 className="text-xl font-bold text-gray-800">
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
        </Card.Header>

        <Card.Content>
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
                  selectedActivities={[]}
                  selectedAccomplishments={[]}
                  onCheckboxChange={() => {}}
                />
              )}
              {children}
            </>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default PositionCard;
