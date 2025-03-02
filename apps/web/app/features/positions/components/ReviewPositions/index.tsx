// File path: apps/web/app/features/positions/components/ReviewPositions/index.tsx
import React, { useState } from "react";
import { Position } from "@fedjobs/types";
import { usePositionsManagement } from "@/app/features/positions/hooks/usePositionsManagement";
import { PositionCard } from "@/app/features/positions/components/PositionCard";
import { SearchBar } from "@/app/shared/components/SearchBar";
import { YearSidebar } from "@/app/shared/components/YearSidebar";
import { ColumnToggle } from "@/app/features/positions/components/ReviewPositions/ColumnToggle";
import { sortPositions, groupPositionsByYear } from '@/app/shared/utils/positionSorting';

type ColumnType = "employment" | "other";
type HiddenColumn = "none" | ColumnType;

interface ColumnConfig {
  width: string;
  display: string;
  transition: string;
}

const ReviewPositions: React.FC = () => {
  const { employmentHistory, otherPositions, isLoading } = usePositionsManagement();
  const [hiddenColumn, setHiddenColumn] = useState<HiddenColumn>("none");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyUnreviewedPositions, setShowOnlyUnreviewedPositions] = useState(true);

  const getColumnStyles = (columnType: ColumnType): ColumnConfig => ({
    width:
      hiddenColumn === "none"
        ? "50%"
        : hiddenColumn === columnType
          ? "0"
          : "100%",
    display: hiddenColumn === columnType ? "none" : "flex",
    transition: "width 300ms ease-in-out",
  });

  const toggleColumn = (columnType: ColumnType) => {
    setHiddenColumn((current) =>
      current === columnType ? "none" : columnType
    );
  };

  // Filter other positions based on search term and review status
  const filteredOtherPositions = otherPositions.filter((pos) => {
    // First apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        pos.title.title.toLowerCase().includes(searchLower) ||
        pos.organization.name.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Then apply "unreviewed only" filter if enabled
    if (showOnlyUnreviewedPositions) {
      // Check if this position has been reviewed (approved or rejected)
      const isReviewed = 
        pos.approvedSimilarPositionUuids.length > 0 || 
        pos.rejectedSimilarPositionUuids.length > 0;
      
      return !isReviewed;
    }
    
    return true;
  });

  const groupedEmployment = groupPositionsByYear(
    sortPositionsDescending(employmentHistory)
  );
  const groupedOther = groupPositionsByYear(
    sortPositionsDescending(filteredOtherPositions)
  );

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
      {/* Employment History Column */}
      <div className="flex" style={getColumnStyles("employment")}>
        <div className="w-40 pr-4 flex-shrink-0">
          <div className="sticky top-4">
            <h4 className="text-base font-semibold mb-2 text-gray-600">
              On this page
            </h4>
            <nav className="border-l border-gray-200">
              <YearSidebar
                years={groupedEmployment.map(([year]) => year)}
                prefix="eh-year-"
                parentId="employment-history"
              />
            </nav>
          </div>
        </div>
        <div
          id="employment-history"
          className="flex-1 overflow-y-auto h-[calc(100vh-6rem)] relative"
        >
          {/* Improved header styling */}
          <div className="sticky top-0 z-20 pb-2 pt-1 bg-gradient-to-b from-gray-50 to-transparent">
            <h2 className="text-xl font-bold text-blue-700 pb-2 border-b border-gray-200">
              Employment History
            </h2>
            <div className="flex justify-end mt-2">
              <ColumnToggle
                isExpanded={hiddenColumn === "other"}
                onToggle={() => toggleColumn("other")}
                label="Employment History"
              />
            </div>
          </div>

          {employmentHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No positions in your employment history yet.
            </div>
          ) : (
            groupedEmployment.map(([year, positions]) => (
              <div key={year} id={`eh-year-${year}`} className="mb-6">
                <h3 className="text-lg font-semibold sticky top-16 bg-gray-50 py-2 z-10 px-2 rounded-lg shadow-sm">{year}</h3>
                <div className="mt-4"></div>
                {positions.map((position) => (
                  <PositionCard
                    key={position.positionUuid}
                    position={position}
                    isEmploymentHistory={true}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Other Positions Column */}
      <div className="flex ml-auto" style={getColumnStyles("other")}>
        <div className="w-40 pr-4 flex-shrink-0">
          <div className="sticky top-4">
            <h4 className="text-base font-semibold mb-2 text-gray-600">
              On this page
            </h4>
            <nav className="border-l border-gray-200">
              <YearSidebar
                years={groupedOther.map(([year]) => year)}
                prefix="other-year-"
                parentId="other-positions"
              />
            </nav>
          </div>
        </div>
        <div
          id="other-positions"
          className="flex-1 overflow-y-auto h-[calc(100vh-6rem)] relative"
        >
          {/* Improved header styling */}
          <div className="sticky top-0 z-20 pb-2 pt-1 bg-gradient-to-b from-gray-50 to-transparent">
            <h2 className="text-xl font-bold text-blue-700 pb-2 border-b border-gray-200">
              Other Positions
            </h2>
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="unreviewedOnly"
                  checked={showOnlyUnreviewedPositions}
                  onChange={() => setShowOnlyUnreviewedPositions(!showOnlyUnreviewedPositions)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="unreviewedOnly" className="text-sm text-gray-700">
                  Show only unreviewed positions
                </label>
              </div>
              <ColumnToggle
                isExpanded={hiddenColumn === "employment"}
                onToggle={() => toggleColumn("employment")}
                label="Other Positions"
              />
            </div>
          </div>

          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

          {filteredOtherPositions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm 
                ? "No positions match your search criteria." 
                : showOnlyUnreviewedPositions
                  ? "No unreviewed positions available."
                  : "No positions available."}
            </div>
          ) : (
            groupedOther.map(([year, positions]) => (
              <div key={year} id={`other-year-${year}`} className="mb-6">
                <h3 className="text-lg font-semibold sticky top-28 bg-gray-50 py-2 z-10 px-2 rounded-lg shadow-sm">
                  {typeof year === "number" ? year : "No Date"}
                </h3>
                <div className="mt-4"></div>
                {positions.map((position) => (
                  <PositionCard
                    key={position.positionUuid}
                    position={position}
                    isEmploymentHistory={false}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Group positions by year function is now imported from shared utils

const sortPositionsDescending = (positions: Position[]): Position[] => {
  return sortPositions(positions);
};

export default ReviewPositions;