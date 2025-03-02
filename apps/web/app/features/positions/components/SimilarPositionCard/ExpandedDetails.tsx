// File path: apps/web/app/features/positions/components/SimilarPositionCard/ExpandedDetails.tsx
import React from "react";

interface ExpandedDetailsProps {
  activities: string[];
  accomplishments: string[];
}

export const ExpandedDetails: React.FC<ExpandedDetailsProps> = ({
  activities,
  accomplishments,
}) => (
  <div className="mt-4 bg-white p-3 border rounded shadow-sm">
    <div className="mb-2">
      <strong>Activities:</strong>
      <ul className="list-disc ml-5">
        {activities.map((act, idx) => (
          <li key={idx}>{act}</li>
        ))}
      </ul>
    </div>
    <div className="mb-2">
      <strong>Accomplishments:</strong>
      <ul className="list-disc ml-5">
        {accomplishments.map((acc, idx) => (
          <li key={idx}>{acc}</li>
        ))}
      </ul>
    </div>
  </div>
);

export default ExpandedDetails;