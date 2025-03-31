// File path: apps/web/app/features/positions/components/ReviewPositions/PositionsColumn.tsx
// File: apps/web/app/features/positions/components/ReviewPositions/PositionsColumn.tsx
"use client";

import React from "react";
import { Position } from "@fedjobs/types";
import { YearSidebar } from "@/app/shared/components/YearSidebar";
import { groupPositionsByYear, sortPositions } from "@/app/shared/utils/positionSorting";
import { PositionCard } from "../PositionCard";
import { ColumnHeader } from "./ColumnHeader";

type ColumnType = "employment" | "other";
type HiddenColumn = "none" | ColumnType;

interface PositionsColumnProps {
  title: string;
  positions: Position[];
  columnType: ColumnType;
  hiddenColumn: HiddenColumn;
  toggleColumn: (col: ColumnType) => void;
  showSearch?: boolean;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  showFilter?: boolean;
  filterChecked?: boolean;
  onFilterChange?: () => void;
  // New prop for forcing the filter off
  forceShowAll?: () => void;
}

export const PositionsColumn: React.FC<PositionsColumnProps> = ({
  title,
  positions,
  columnType,
  hiddenColumn,
  toggleColumn,
  showSearch = false,
  searchTerm = "",
  onSearchChange,
  showFilter = false,
  filterChecked = false,
  onFilterChange,
  forceShowAll,
}) => {
  const grouped = groupPositionsByYear(sortPositions(positions));

  const getColumnStyles = () => {
    if (hiddenColumn === columnType) {
      return { width: "0%", overflow: "hidden", transition: "width 300ms ease-in-out" };
    } else if (hiddenColumn === "none") {
      return { width: "50%", transition: "width 300ms ease-in-out" };
    } else {
      return { width: "100%", transition: "width 300ms ease-in-out" };
    }
  };

  return (
    <div className="flex" style={getColumnStyles()}>
      <div className="w-32 pr-4 flex-shrink-0">
        <div className="sticky top-0">
          <h4 className="text-base font-semibold mb-2 text-gray-600">Years</h4>
          <nav className="border-l border-gray-200">
            <YearSidebar
              years={grouped.map(([year]) => year)}
              prefix={`${columnType}-year-`}
              parentId={`${columnType}-positions`}
              headerOffset={0}
            />
          </nav>
        </div>
      </div>
      <div className="flex-1">
        <ColumnHeader
          title={title}
          toggleColumn={() => toggleColumn(columnType)}
          isExpanded={hiddenColumn !== columnType}
          showFilter={showFilter}
          filterChecked={filterChecked}
          onFilterChange={onFilterChange}
          showSearch={showSearch}
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
        <div id={`${columnType}-positions`} className="overflow-y-auto h-[calc(100vh-10rem)]">
          {grouped.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No positions found.</div>
          ) : (
            grouped.map(([year, yearPositions]) => (
              <div key={year} id={`${columnType}-year-${year}`} className="mb-6">
                <h3 className="text-lg font-semibold sticky top-0 bg-gray-50 py-2 z-10 px-2 rounded-lg">
                  {typeof year === "number" ? year : "No Date"}
                </h3>
                {yearPositions.map((pos) => (
                  <PositionCard
                    key={pos.positionUuid}
                    position={pos}
                    isEmploymentHistory={columnType === "employment"}
                    forceShowAll={forceShowAll}  // pass it down
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
