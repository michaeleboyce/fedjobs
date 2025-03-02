// Updated: apps/web/app/features/positions/components/ReviewPositions/index.tsx
import React, { useState } from "react";
import { YearSidebar } from "@/app/shared/components/YearSidebar";
import { sortPositions, groupPositionsByYear } from '@/app/shared/utils/positionSorting';
import { ColumnHeader } from "./ColumnHeader";
import { YearSection } from "./YearSection";
import { usePositionsManagement } from "@/app/features/positions/hooks/usePositionsManagement";
import { ColumnToggle } from "./ColumnToggle";
import { PositionCard } from "../PositionCard";
import { SearchBar } from "@/app/shared/components/SearchBar";

type ColumnType = "employment" | "other";
type HiddenColumn = "none" | ColumnType;

const ReviewPositions: React.FC = () => {
  const { employmentHistory, otherPositions, isLoading } = usePositionsManagement();
  const [hiddenColumn, setHiddenColumn] = useState<HiddenColumn>("none");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyUnreviewedPositions, setShowOnlyUnreviewedPositions] = useState(true);

  const getColumnStyles = (columnType: ColumnType) => ({
    width: hiddenColumn === "none" ? "50%" : hiddenColumn === columnType ? "0%" : "100%",
    display: hiddenColumn === columnType ? "none" : "block",
    transition: "width 300ms ease-in-out",
  });

  const toggleColumn = (columnType: ColumnType) => {
    setHiddenColumn((current) => current === columnType ? "none" : columnType);
  };

  // Filter positions
  const filteredOtherPositions = otherPositions.filter((pos) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!pos.title.title.toLowerCase().includes(searchLower) &&
          !pos.organization.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    if (showOnlyUnreviewedPositions) {
      const isReviewed = pos.approvedSimilarPositionUuids.length > 0 || 
                        pos.rejectedSimilarPositionUuids.length > 0;
      return !isReviewed;
    }
    
    return true;
  });

  const groupedEmployment = groupPositionsByYear(sortPositions(employmentHistory));
  const groupedOther = groupPositionsByYear(sortPositions(filteredOtherPositions));

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-pulse text-center">
        <div className="h-8 w-64 bg-gray-200 rounded mb-4 mx-auto"></div>
        <div className="h-4 w-48 bg-gray-200 rounded mb-2 mx-auto"></div>
        <div className="h-4 w-56 bg-gray-200 rounded mb-4 mx-auto"></div>
        <div className="text-gray-500">Loading positions...</div>
      </div>
    </div>;
  }

  return (
    <div className="flex gap-4 p-6 min-h-screen">
      {/* Employment History Column */}
      <div className="flex" style={getColumnStyles("employment")}>
        {/* Year sidebar */}
        <div className="w-32 pr-4 flex-shrink-0">
          <div className="sticky top-4">
            <h4 className="text-base font-semibold mb-2 text-gray-600">Years</h4>
            <nav className="border-l border-gray-200">
              <YearSidebar
                years={groupedEmployment.map(([year]) => year)}
                prefix="eh-year-"
                parentId="employment-history"
              />
            </nav>
          </div>
        </div>

        {/* Main content column with header and positions */}
        <div className="flex-1">
          {/* Sticky header */}
          <div className="sticky top-0 z-30 bg-gray-50 pb-2">
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

          {/* Scrollable positions */}
          <div id="employment-history" className="overflow-y-auto h-[calc(100vh-10rem)]">
            {employmentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No positions in your employment history yet.
              </div>
            ) : (
              groupedEmployment.map(([year, positions]) => (
                <div key={year} id={`eh-year-${year}`} className="mb-6">
                  <h3 className="text-lg font-semibold sticky top-20 bg-gray-50 py-2 z-10 px-2 rounded-lg">{year}</h3>
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
      </div>

      {/* Other Positions Column */}
      <div className="flex" style={getColumnStyles("other")}>
        {/* Year sidebar */}
        <div className="w-32 pr-4 flex-shrink-0">
          <div className="sticky top-4">
            <h4 className="text-base font-semibold mb-2 text-gray-600">Years</h4>
            <nav className="border-l border-gray-200">
              <YearSidebar
                years={groupedOther.map(([year]) => year)}
                prefix="other-year-"
                parentId="other-positions"
              />
            </nav>
          </div>
        </div>

        {/* Main content column with header and positions */}
        <div className="flex-1">
          {/* Sticky header */}
          <div className="sticky top-0 z-30 bg-gray-50 pb-2">
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
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} className="mt-2" />
          </div>

          {/* Scrollable positions */}
          <div id="other-positions" className="overflow-y-auto h-[calc(100vh-14rem)]">
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
                  <h3 className="text-lg font-semibold sticky top-36 bg-gray-50 py-2 z-10 px-2 rounded-lg">
                    {typeof year === "number" ? year : "No Date"}
                  </h3>
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
    </div>
  );

};

export default ReviewPositions;