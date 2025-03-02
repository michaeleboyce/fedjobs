// File path: apps/web/app/features/positions/components/SimilarPositionCard/LoadingSkeleton.tsx

import React from "react";

export const LoadingSkeleton: React.FC = () => (
  <div className="border p-4 rounded bg-gray-50 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
  </div>
);

export default LoadingSkeleton;