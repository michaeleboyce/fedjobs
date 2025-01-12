// File path: apps/web/app/_components/PositionCard/PositionDetails.tsx
import React from 'react';

interface PositionDetailsProps {
  position: any;
  isExpanded: boolean;
  similarCount: number;
  isEmploymentHistory: boolean;
  onExpandToggle: () => void;
}

export const PositionDetails: React.FC<PositionDetailsProps> = ({ position, isExpanded, similarCount, isEmploymentHistory, onExpandToggle }) => {
  const countColor = similarCount === 0 ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-800';
  
  return (
    <>
      <div 
        className={`px-2 py-1 rounded text-sm mb-2 cursor-pointer ${countColor}`} 
        onClick={onExpandToggle}
      >
        {isEmploymentHistory ? (
          <>
            {similarCount} similar positions under review, {position.approvedSimilarPositionUuids.length} approved
          </>
        ) : (
          <>
            {similarCount} similar {similarCount === 1 ? 'position' : 'positions'}
          </>
        )}
      </div>
      <div className="text-gray-600">
        <div>{position.organization.name}</div>
        <div>
          {position.date.startDate} - {position.date.present ? "Present" : position.date.endDate}
        </div>
      </div>
    </>
  );
};
