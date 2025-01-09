// File path: apps/web/app/_components/SimilarPositionCard/index.tsx
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import { Position } from "@fedjobs/types";
import { getPosition } from "@/app/_actions/positions/positionActions";
import { usePositions } from "../PositionCard/Context/PositionsContext";

interface SimilarPositionCardProps {
  similarId: string;
  currentPosition: Position;
  isEmploymentHistory: boolean;
  onViewOriginal: () => void;
  isLoading: boolean;
}

export const SimilarPositionCard: React.FC<SimilarPositionCardProps> = ({
  similarId,
  currentPosition,
  isEmploymentHistory,
  onViewOriginal,
  isLoading
}) => {
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(true);
  const { employmentHistory } = usePositions();

  // Check if this position is in employment history
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

  return (
    <div className={`border p-4 rounded ${isInEmploymentHistory ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
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
          <p className="text-gray-600">
            {position.organization.name}
          </p>
          <p className="text-sm text-gray-500">
            {position.date.startDate} - {position.date.present ? 'Present' : position.date.endDate}
          </p>
        </div>

        <button
          onClick={onViewOriginal}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1"
          title="View position"
        >
          <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
          <span>View</span>
        </button>
      </div>
    </div>
  );
};