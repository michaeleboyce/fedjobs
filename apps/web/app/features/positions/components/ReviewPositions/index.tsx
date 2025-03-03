// app/features/positions/components/ReviewPositions/index.tsx
"use client";

import React, { useState, useEffect } from "react";
import { usePositions } from "../../context/PositionsContext";
import { PositionsColumn } from "./PositionsColumn";

type ColumnType = "employment" | "other";
type HiddenColumn = "none" | ColumnType;

const ReviewPositions: React.FC = () => {
  const { 
    employmentHistory, 
    otherPositions, 
    isLoading,
    fetchPositions
  } = usePositions();
  
  // Ensure positions are fetched when component mounts
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // Expand/collapse logic
  const [hiddenColumn, setHiddenColumn] = useState<HiddenColumn>("none");
  const toggleColumn = (col: ColumnType) => {
    setHiddenColumn((current) => (current === col ? "none" : col));
  };

  // Filter state (Show only unreviewed)
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyUnreviewed, setShowOnlyUnreviewed] = useState(true);

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

  return (
    <div className="flex gap-4 p-6 min-h-screen">
      {/* Employment Column */}
      <PositionsColumn
        title="Employment History"
        positions={employmentHistory}
        columnType="employment"
        hiddenColumn={hiddenColumn}
        toggleColumn={toggleColumn}
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
        forceShowAll={() => setShowOnlyUnreviewed(false)}
      />
    </div>
  );
};

export default ReviewPositions;