// File path: apps/web/app/_components/ReviewPositions/index.tsx
import React, { useState } from "react";
import { Position } from "@fedjobs/types";
import { usePositionsManagement } from "@/app/features/positions/hooks/usePositionsManagement";
import { PositionCard } from "@/app/features/positions/components/PositionCard"
import { SearchBar } from "@/app/shared/components/SearchBar";
import { YearSidebar } from "@/app/shared/components/YearSidebar";
import { ColumnToggle } from "@/app/features/positions/components/ReviewPositions/ColumnToggle";

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

  const filteredOtherPositions = otherPositions.filter((pos) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      pos.title.title.toLowerCase().includes(searchLower) ||
      pos.organization.name.toLowerCase().includes(searchLower)
    );
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
    <div className="flex gap-2 p-4 min-h-screen">
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
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 py-2">
            <h2 className="text-xl font-bold">Employment History</h2>
            <ColumnToggle
              isExpanded={hiddenColumn === "other"}
              onToggle={() => toggleColumn("other")}
              label="Employment History"
            />
          </div>

          {employmentHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No positions in your employment history yet.
            </div>
          ) : (
            groupedEmployment.map(([year, positions]) => (
              <div key={year} id={`eh-year-${year}`} className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{year}</h3>
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
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 py-2">
            <h2 className="text-xl font-bold">Other Positions</h2>
            <ColumnToggle
              isExpanded={hiddenColumn === "employment"}
              onToggle={() => toggleColumn("employment")}
              label="Other Positions"
            />
          </div>

          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

          {filteredOtherPositions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm 
                ? "No positions match your search criteria." 
                : "No positions available."}
            </div>
          ) : (
            groupedOther.map(([year, positions]) => (
              <div key={year} id={`other-year-${year}`} className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
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
  );
};

const groupPositionsByYear = (
  positions: Position[]
): [number | string, Position[]][] => {
  const map = new Map<number | string, Position[]>();
  positions.forEach((pos) => {
    const hasValidDate = pos.date.startDate || pos.date.endDate;
    let key: number | string;
    if (!hasValidDate) {
      key = "No Date";
    } else {
      const baseDate = pos.date.endDate || pos.date.startDate;
      key = new Date(baseDate).getFullYear();
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(pos);
  });
  const entries = Array.from(map.entries());
  entries.sort((a, b) => {
    // Sort numeric years descending, "No Date" goes last
    if (typeof a[0] === "number" && typeof b[0] === "string") return -1;
    if (typeof a[0] === "string" && typeof b[0] === "number") return 1;
    if (typeof a[0] === "number" && typeof b[0] === "number") {
      return (b[0] as number) - (a[0] as number);
    }
    return 0;
  });
  return entries;
};

const sortPositionsDescending = (positions: Position[]): Position[] => {
  return [...positions].sort((a, b) => {
    const dateA = new Date(a.date.endDate || a.date.startDate);
    const dateB = new Date(b.date.endDate || b.date.startDate);
    const timeA = isNaN(dateA.getTime()) ? -Infinity : dateA.getTime();
    const timeB = isNaN(dateB.getTime()) ? -Infinity : dateB.getTime();
    // Place positions without valid dates at the bottom
    if (timeA === -Infinity && timeB === -Infinity) return 0;
    if (timeA === -Infinity) return 1;
    if (timeB === -Infinity) return -1;
    return timeB - timeA;
  });
};

export default ReviewPositions;
