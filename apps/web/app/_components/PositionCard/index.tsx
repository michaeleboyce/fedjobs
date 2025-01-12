// File path: apps/web/app/_components/PositionCard/index.tsx
import React, { useState } from "react";
import { Position } from "@fedjobs/types";
import { usePositions } from "./Context/PositionsContext";
import { PositionHeader } from "./PositionHeader";
import { PositionEditForm } from "./PositionEditForm";
import { PositionDetails } from "./PositionDetails";
import { SimilarPositionsSections } from "./SimilarPositionsSections";

interface PositionCardProps {
  position: Position;
  isEmploymentHistory: boolean;
}

export const PositionCard: React.FC<PositionCardProps> = ({
  position,
  isEmploymentHistory,
}) => {
  const { 
    loadingPositions, 
    handleUpdatePosition, 
    handleAddToEmploymentHistory,
    handleRemoveFromEmploymentHistory,
    handleApproveSimilar,
    handleRejectSimilar,
    handleRemoveApprovedSimilar,
    handleRemoveRejectedSimilar
  } = usePositions();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit state
  const [tempTitle, setTempTitle] = useState(position.title.title);
  const [tempOrg, setTempOrg] = useState(position.organization.name);
  const [tempStartDate, setTempStartDate] = useState(position.date.startDate);
  const [tempEndDate, setTempEndDate] = useState(position.date.endDate);
  const [tempPresent, setTempPresent] = useState(position.date.present);
  const [tempActivities, setTempActivities] = useState([...position.details.activities]);
  const [tempAccomplishments, setTempAccomplishments] = useState([...position.details.accomplishments]);

  const isLoading = loadingPositions.has(position.positionUuid);

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
    <div id={`position-${position.positionUuid}`} className="border p-4 rounded mb-4 shadow-sm bg-white">
      <PositionHeader
        isEditing={isEditing}
        isEmploymentHistory={isEmploymentHistory}
        isLoading={isLoading}
        isExpanded={isExpanded}
        position={position}
        onAddToEmploymentHistory={() => handleAddToEmploymentHistory(position.positionUuid)}
        onRemoveFromEmploymentHistory={() => handleRemoveFromEmploymentHistory(position.positionUuid)}
        onEditToggle={() => setIsEditing(!isEditing)}
        onExpandToggle={() => setIsExpanded(!isExpanded)}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setIsEditing(false)}
      />
      {!isExpanded && (
        <PositionDetails 
          position={position} 
          isExpanded={isExpanded} 
          similarCount={similarCount} 
          isEmploymentHistory={isEmploymentHistory}
          onExpandToggle={() => setIsExpanded(!isExpanded)}
        />
      )}
      {isExpanded && (
        <>
          {isEditing ? (
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
          ) : (
            <>
              <div className="mt-4">
                <strong>Activities:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {position.details.activities.map((act, idx) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <strong>Accomplishments:</strong>
                <ul className="list-disc ml-5 mt-1">
                  {position.details.accomplishments.map((acc, idx) => (
                    <li key={idx}>{acc}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <SimilarPositionsSections
            position={position}
            isEmploymentHistory={isEmploymentHistory}
            loadingPositions={loadingPositions}
            handleApproveSimilar={handleApproveSimilar}
            handleRejectSimilar={handleRejectSimilar}
            handleRemoveApprovedSimilar={handleRemoveApprovedSimilar}
            handleRemoveRejectedSimilar={handleRemoveRejectedSimilar}
          />
        </>
      )}
    </div>
  );
};
