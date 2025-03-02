// File path: apps/web/app/features/positions/components/PositionCard/index.tsx
import React, { useState, useEffect } from "react";
import { Position } from "@fedjobs/types";
import { usePositions } from "../../context/PositionsContext";
import { PositionHeader } from "./PositionHeader";
import { PositionEditForm } from "./PositionEditForm";
import { PositionDetails } from "./PositionDetails";
import { SimilarPositionsSections } from "./SimilarPositionsSections";

interface PositionCardProps {
  position: Position;
  isEmploymentHistory: boolean;
  /** If true => we hide any remove/edit/approve UI for generation context. */
  isGenerationView?: boolean;
  /** If true => show checkboxes to select items. */
  selectionMode?: boolean;
  selectedActivities?: number[];
  selectedAccomplishments?: number[];
  onCheckboxChange?: (
    type: "activities" | "accomplishments",
    idx: number
  ) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  isEmploymentHistory,
  isGenerationView = false,
  selectionMode = false,
  selectedActivities = [],
  selectedAccomplishments = [],
  onCheckboxChange,
  onSelectAll,
  onClearAll,
}) => {
  const {
    loadingPositions,
    handleUpdatePosition,
    handleAddToEmploymentHistory,
    handleRemoveFromEmploymentHistory,
    handleApproveSimilar,
    handleRejectSimilar,
    handleRemoveApprovedSimilar,
    handleRemoveRejectedSimilar,
  } = usePositions();

  // Default to closed state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Track whether similar positions have been loaded
  const [similarPositionsLoaded, setSimilarPositionsLoaded] = useState(false);

  // Local "edit" state
  const [tempTitle, setTempTitle] = useState(position.title.title);
  const [tempOrg, setTempOrg] = useState(position.organization.name);
  const [tempStartDate, setTempStartDate] = useState(position.date.startDate);
  const [tempEndDate, setTempEndDate] = useState(position.date.endDate);
  const [tempPresent, setTempPresent] = useState(position.date.present);
  const [tempActivities, setTempActivities] = useState([
    ...position.details.activities,
  ]);
  const [tempAccomplishments, setTempAccomplishments] = useState([
    ...position.details.accomplishments,
  ]);

  const isLoading = loadingPositions.has(position.positionUuid);

  // Toggle expansion and handle similiar positions loading
  const toggleExpansion = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // Mark similar positions as loaded when first expanded
    if (newExpandedState && !similarPositionsLoaded) {
      setSimilarPositionsLoaded(true);
    }
  };

  async function saveEdit() {
    await handleUpdatePosition(position.positionUuid, {
      title: { title: tempTitle },
      organization: { name: tempOrg },
      date: {
        startDate: tempStartDate,
        endDate: tempEndDate,
        present: tempPresent,
      },
      details: {
        activities: tempActivities,
        accomplishments: tempAccomplishments,
      },
    });
    setIsEditing(false);
  }

  const similarCount = position.similarPositionUuids?.length ?? 0;

  return (
    <div
      id={`position-${position.positionUuid}`}
      className="border p-4 rounded mb-4 shadow-sm bg-white"
      data-position-element="true"
    >
      <PositionHeader
        position={position}
        isEditing={isEditing}
        isEmploymentHistory={isEmploymentHistory}
        isGenerationView={isGenerationView}
        isLoading={isLoading}
        isExpanded={isExpanded}
        /** Hide remove-from-history if isGenerationView is true */
        onAddToEmploymentHistory={() =>
          handleAddToEmploymentHistory(position.positionUuid)
        }
        onRemoveFromEmploymentHistory={() =>
          handleRemoveFromEmploymentHistory(position.positionUuid)
        }
        onEditToggle={() => setIsEditing(!isEditing)}
        onExpandToggle={toggleExpansion}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setIsEditing(false)}
      />

      {/* If selectionMode => show "Select All" + "Clear All" */}
      {selectionMode && (
        <div className="mt-2 flex items-center gap-2">
          <button
            className="bg-green-500 text-white px-2 py-1 rounded"
            onClick={onSelectAll}
          >
            Select All
          </button>
          <button
            className="bg-gray-400 text-white px-2 py-1 rounded"
            onClick={onClearAll}
          >
            Clear All
          </button>
        </div>
      )}

      {/* If not expanded => minimal details */}
      <PositionDetails
        position={position}
        similarCount={similarCount}
        isEmploymentHistory={isEmploymentHistory}
        onExpandToggle={toggleExpansion}
      />

      {isEditing && (
        <PositionEditForm
          tempTitle={tempTitle}
          setTempTitle={setTempTitle}
          tempOrg={tempOrg}
          setTempOrg={setTempOrg}
          tempStartDate={tempStartDate}
          setTempStartDate={setTempStartDate}
          tempEndDate={tempEndDate}
          setTempEndDate={setTempEndDate}
          tempPresent={tempPresent}
          setTempPresent={setTempPresent}
          tempActivities={tempActivities}
          setTempActivities={setTempActivities}
          tempAccomplishments={tempAccomplishments}
          setTempAccomplishments={setTempAccomplishments}
        />
      )}
      {/* If expanded => either editing form or read-only details + similar positions */}
      {isExpanded && !isEditing && (
        <>
          <div className="mt-4">
            <strong>Activities:</strong>
            <ul className="list-disc ml-5 mt-1">
              {position.details.activities.map((act, idx) => {
                const isChecked = selectedActivities.includes(idx);
                return (
                  <li key={idx} className="flex items-center gap-2">
                    {selectionMode && onCheckboxChange && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onCheckboxChange("activities", idx)}
                      />
                    )}
                    <span>{act}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-3">
            <strong>Accomplishments:</strong>
            <ul className="list-disc ml-5 mt-1">
              {position.details.accomplishments.map((acc, idx) => {
                const isChecked = selectedAccomplishments.includes(idx);
                return (
                  <li key={idx} className="flex items-center gap-2">
                    {selectionMode && onCheckboxChange && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          onCheckboxChange("accomplishments", idx)
                        }
                      />
                    )}
                    <span>{acc}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* Only render similar positions when expanded AND loaded */}
      {isExpanded && similarPositionsLoaded && (
        <SimilarPositionsSections
          position={position}
          isEmploymentHistory={isEmploymentHistory}
          /** Pass the new prop so it hides "remove" or "approve/reject" for generation */
          isGenerationView={isGenerationView}
          loadingPositions={loadingPositions}
          handleApproveSimilar={handleApproveSimilar}
          handleRejectSimilar={handleRejectSimilar}
          handleRemoveApprovedSimilar={handleRemoveApprovedSimilar}
          handleRemoveRejectedSimilar={handleRemoveRejectedSimilar}
        />
      )}
    </div>
  );
};