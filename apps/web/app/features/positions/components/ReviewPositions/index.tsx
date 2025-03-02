// File: apps/web/app/features/positions/components/ReviewPositions/index.tsx
"use client";

import React, { useState } from "react";
import { usePositionsManagement } from "@/app/features/positions/hooks/usePositionsManagement";
import { PositionsColumn } from "./PositionsColumn";

type ColumnType = "employment" | "other";
type HiddenColumn = "none" | ColumnType;

const ReviewPositions: React.FC = () => {
  const { employmentHistory, otherPositions, isLoading } = usePositionsManagement();

  // Expand/collapse logic
  const [hiddenColumn, setHiddenColumn] = useState<HiddenColumn>("none");
  const toggleColumn = (col: ColumnType) => {
    setHiddenColumn((current) => (current === col ? "none" : col));
  };

  // Optional search/filter
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyUnreviewed, setShowOnlyUnreviewed] = useState(true);

  // Example filtering
  const filteredOthers = otherPositions.filter((pos) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (
        !pos.title.title.toLowerCase().includes(s) &&
        !pos.organization.name.toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    if (showOnlyUnreviewed) {
      const reviewed =
        pos.approvedSimilarPositionUuids.length > 0 ||
        pos.rejectedSimilarPositionUuids.length > 0;
      return !reviewed;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="h-8 w-64 bg-gray-200 rounded mb-4 mx-auto"></div>
          <div className="h-4 w-48 bg-gray-200 rounded mb-2 mx-auto"></div>
          <div className="h-4 w-56 bg-gray-200 rounded mb-4 mx-auto"></div>
          <div className="text-gray-500">Loading positions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-6 min-h-screen">
      {/* Employment Column */}
      <PositionsColumn
        title="Employment History"
        positions={employmentHistory}
        columnType="employment"
        hiddenColumn={hiddenColumn}
        toggleColumn={toggleColumn}
        // no search/filter needed here, but you could add them
      />

      {/* Other Positions Column */}
      <PositionsColumn
        title="Other Positions"
        positions={filteredOthers}
        columnType="other"
        hiddenColumn={hiddenColumn}
        toggleColumn={toggleColumn}
        showSearch={true}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showFilter={true}
        filterChecked={showOnlyUnreviewed}
        onFilterChange={() => setShowOnlyUnreviewed(!showOnlyUnreviewed)}
      />
    </div>
  );
};

export default ReviewPositions;