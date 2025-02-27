// File path: apps/web/app/_components/Resume/components/SimilarPositionCard/index.tsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { Position } from '@fedjobs/types';
import Link from 'next/link'; // Assuming you're using Next.js

interface SimilarPositionCardProps {
  position: Position;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

export const SimilarPositionCard: React.FC<SimilarPositionCardProps> = ({
  position,
  onApprove,
  onReject,
  isLoading,
}) => {
  return (
    <div className="border p-4 rounded mb-2 flex justify-between items-center">
      <div>
        <h5 className="font-semibold">
          <a href={`#position-${position.positionUuid}`} className="text-blue-500 hover:underline">
            {position.title.title} at {position.organization.name}
          </a>
        </h5>
        <p className="text-gray-600">
          {position.date.startDate} - {position.date.present ? 'Present' : position.date.endDate}
        </p>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onApprove}
          className="bg-green-500 text-white px-3 py-1 rounded flex items-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
          ) : (
            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
          )}
          Approve
        </button>
        <button
          onClick={onReject}
          className="bg-red-500 text-white px-3 py-1 rounded flex items-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
          ) : (
            <FontAwesomeIcon icon={faTimesCircle} className="mr-2" />
          )}
          Reject
        </button>
      </div>
    </div>
  );
};
