// File path: apps/web/app/_components/ReviewPositions/PositionsSection.tsx
import React from "react";
import { Position } from "@fedjobs/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PositionCard } from "@/app/features/resume/components/PositionCard";
import { EditPositionForm } from "./EditPositionsForm";

interface PositionsSectionProps {
  title: string;
  filteredPositions: Position[];
  expandedPositions: Set<string>;
  loadingPositions: Set<string>;
  editingPositionUuid: string | null;
  editedDetails: Partial<Position>;
  selectedSelections: Record<
    string,
    { selectedActivities: number[]; selectedAccomplishments: number[] }
  >;
  onToggleExpand: (positionUuid: string) => void;
  onCheckboxChange: (positionUuid: string, type: "activities" | "accomplishments", idx: number) => void;
  onSelectAll: (positionUuid: string, type: "activities" | "accomplishments") => void;
  onClearAll: (positionUuid: string, type: "activities" | "accomplishments") => void;
  onEditPosition: (position: Position) => void;
  onCancelEdit: () => void;
  onSaveEdit: (positionUuid: string) => void;
  onInputChange: (field: keyof Position, value: any) => void;
  // Custom action render callback for each position
  renderActions: (position: Position) => React.ReactNode;
  // Callback to render similar positions for a given position
  renderSimilarPositions: (position: Position) => React.ReactNode;
}

export const PositionsSection: React.FC<PositionsSectionProps> = ({
  title,
  filteredPositions,
  expandedPositions,
  loadingPositions,
  editingPositionUuid,
  editedDetails,
  selectedSelections,
  onToggleExpand,
  onCheckboxChange,
  onSelectAll,
  onClearAll,
  onEditPosition,
  onCancelEdit,
  onSaveEdit,
  onInputChange,
  renderActions,
  renderSimilarPositions,
}) => (
  <section className="mb-8">
    <h2 className="text-xl font-semibold mb-4">{title}</h2>
    {filteredPositions.length === 0 ? (
      <p className="text-gray-600">
        {title.includes("Employment")
          ? "No positions in Employment History."
          : "No other positions available."}
      </p>
    ) : (
      filteredPositions.map((position) => (
        <PositionCard
          key={position.positionUuid}
          id={`position-${position.positionUuid}`}
          position={position}
          isOpen={expandedPositions.has(position.positionUuid)}
          isViewOnly={false}
          selectedActivities={
            selectedSelections[position.positionUuid]?.selectedActivities || []
          }
          selectedAccomplishments={
            selectedSelections[position.positionUuid]?.selectedAccomplishments || []
          }
          onToggleDetails={() => onToggleExpand(position.positionUuid)}
          onCheckboxChange={(type, idx) =>
            onCheckboxChange(position.positionUuid, type, idx)
          }
          onSelectAll={() => onSelectAll(position.positionUuid, "activities")}
          onClearAll={() => onClearAll(position.positionUuid, "activities")}
          actions={renderActions(position)}
        >
          {expandedPositions.has(position.positionUuid) && renderSimilarPositions(position)}
          {editingPositionUuid === position.positionUuid && (
            <EditPositionForm
              position={editedDetails as Position}
              onCancel={onCancelEdit}
              onSave={() => onSaveEdit(position.positionUuid)}
              isLoading={loadingPositions.has(position.positionUuid)}
              onChange={onInputChange}
            />
          )}
        </PositionCard>
      ))
    )}
  </section>
);
