// File path: apps/web/app/features/positions/components/SimilarPositionCard/index.tsx

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faCheckCircle, faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Position } from "@fedjobs/types";
import { getPosition } from "@/app/features/positions/actions/positionActions";
import { usePositions } from "../../context/PositionsContext";

interface SimilarPositionCardProps {
  similarId: string;
  currentPosition: Position;
  isEmploymentHistory: boolean;
  /** If true => hide remove/approve/reject, and “View” shows full info. */
  isGenerationView: boolean;
  onViewOriginal: () => void;
  isLoading: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
}

export const SimilarPositionCard: React.FC<SimilarPositionCardProps> = ({
  similarId,
  currentPosition,
  isEmploymentHistory,
  isGenerationView,
  onViewOriginal,
  isLoading,
  onApprove,
  onReject,
  onRemove
}) => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(true);
  const { employmentHistory } = usePositions();

  /** For showing full info in both modes */
  const [expanded, setExpanded] = useState(false);

  const isInEmploymentHistory = employmentHistory.some(
    p => p.positionUuid === similarId
  );

  useEffect(() => {
    const fetchPosition = async () => {
      const response = await getPosition(similarId);
      if (response.success) {
        setPosition(response.position);
      }
      setIsLoadingPosition(false);
    };
    fetchPosition();
  }, [similarId]);

  if (isLoadingPosition || !position) {
    return (
      <div className="border p-4 rounded bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  /** For Generation mode: toggle full details */
  const handleExpandToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={`border p-4 rounded ${isInEmploymentHistory ? 'bg-green-50 border-green-200' : 'bg-gray-50'} mb-2`}>
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-2">
          <div className="flex items-center">
            <h5 className="font-semibold text-lg mr-2">
              {position.title.title}
            </h5>
            {isInEmploymentHistory && (
              <span className="text-green-600 flex items-center text-sm">
                <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 mr-1" />
                In Employment History
              </span>
            )}
          </div>
          <p className="text-gray-600">{position.organization.name}</p>
          <p className="text-sm text-gray-500">
            {position.date.startDate} - {position.date.present ? 'Present' : position.date.endDate}
          </p>
        </div>

        {/* Action buttons on the right */}
        <div className="flex flex-col space-y-2">
          {/* Approve/Reject/Remove buttons for non-generation mode */}
          {(!isGenerationView && onApprove) && (
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Approve
            </button>
          )}
          {(!isGenerationView && onReject) && (
            <button
              onClick={onReject}
              disabled={isLoading}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Reject
            </button>
          )}
          {(!isGenerationView && onRemove) && (
            <button
              onClick={onRemove}
              disabled={isLoading}
              className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
            >
              Remove
            </button>
          )}

          {isGenerationView ? (
            // Single Expand/Hide button for Generation mode
            <button
              onClick={handleExpandToggle}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1 text-sm"
              title="Expand similar information"
            >
              <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="h-4 w-4" />
              <span>{expanded ? "Hide" : "Expand"}</span>
            </button>
          ) : (
            // Expand and Jump To buttons for non-Generation mode
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1 text-sm"
                title="Expand similar information"
              >
                <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="h-4 w-4" />
                <span>{expanded ? "Hide" : "Expand"}</span>
              </button>
              <button
                onClick={onViewOriginal}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1 text-sm"
                title="Jump to original position"
              >
                <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                <span>Jump To</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Show full details if expanded in either mode */}
      {expanded && (
        <div className="mt-4 bg-white p-3 border rounded shadow-sm">
          <div className="mb-2">
            <strong>Activities:</strong>
            <ul className="list-disc ml-5">
              {position.details.activities.map((act, idx) => (
                <li key={idx}>{act}</li>
              ))}
            </ul>
          </div>
          <div className="mb-2">
            <strong>Accomplishments:</strong>
            <ul className="list-disc ml-5">
              {position.details.accomplishments.map((acc, idx) => (
                <li key={idx}>{acc}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
