// File path: apps/web/app/(routes)/review-positions/page.tsx
// apps/web/app/(routes)/review-positions/page.tsx

import React from 'react';
import { getAllPositions, addToEmploymentHistory, rejectPosition } from '@/app/_actions/positions/reviewPositionActions';
import ReviewPositions from '@/app/_components/ReviewPositions';

const ReviewPositionsPage: React.FC = async () => {
  const positionsResponse = await getAllPositions();

  if (!positionsResponse.success) {
    // Handle error, possibly render an error component or message
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="ml-2 text-red-500">{positionsResponse.error}</span>
      </div>
    );
  }

  const { employmentHistory, otherPositions } = positionsResponse;

  return (
    <ReviewPositions 
      employmentHistory={employmentHistory}
      otherPositions={otherPositions}
      addToEmploymentHistory={addToEmploymentHistory}
      rejectPosition={rejectPosition} 
    />
  );
};

export default ReviewPositionsPage;
