// File path: apps/web/app/features/positions/components/ReviewPositions/YearSection.tsx
// New file: apps/web/app/features/positions/components/ReviewPositions/YearSection.tsx
import React from 'react';
import { Position } from '@fedjobs/types';
import { PositionCard } from '../PositionCard';

interface YearSectionProps {
  year: number | string;
  positions: Position[];
  isEmploymentHistory: boolean;
  idPrefix: string;
}

export const YearSection: React.FC<YearSectionProps> = ({
  year,
  positions,
  isEmploymentHistory,
  idPrefix,
}) => {
  return (
    <div id={`${idPrefix}${year}`} className="mb-6">
      <h3 className="text-lg font-semibold sticky top-28 bg-gray-50 py-2 z-20 px-2 rounded-lg">
        {typeof year === "number" ? year : "No Date"}
      </h3>
      <div className="mt-4">
        {positions.map((position) => (
          <PositionCard
            key={position.positionUuid}
            position={position}
            isEmploymentHistory={isEmploymentHistory}
          />
        ))}
      </div>
    </div>
  );
};