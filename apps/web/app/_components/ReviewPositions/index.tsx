import React, { useState } from "react";
import { Position } from "@fedjobs/types";
import { usePositions } from "@/app/_components/PositionCard/Context/PositionsContext";
import { PositionCard } from "@/app/_components/PositionCard";
import { SearchBar } from "@/app/_components/SearchBar";
import { YearSidebar } from "@/app/_components/YearSidebar";
import { ColumnToggle } from "@/app/_components/ReviewPositions/ColumnToggle";

type ColumnType = 'employment' | 'other';
type HiddenColumn = 'none' | ColumnType;

interface ColumnConfig {
  width: string;
  display: string;
  transition: string;
}

const ReviewPositions: React.FC = () => {
  const { employmentHistory, otherPositions } = usePositions();
  const [hiddenColumn, setHiddenColumn] = useState<HiddenColumn>('none');
  const [searchTerm, setSearchTerm] = useState("");

  const getColumnStyles = (columnType: ColumnType): ColumnConfig => ({
    width: hiddenColumn === 'none' ? '50%' : hiddenColumn === columnType ? '0' : '100%',
    display: hiddenColumn === columnType ? 'none' : 'flex',
    transition: 'width 300ms ease-in-out'
  });

  const toggleColumn = (columnType: ColumnType) => {
    setHiddenColumn(current => 
      current === columnType ? 'none' : columnType
    );
  };

  const filteredOtherPositions = otherPositions.filter(pos => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      pos.title.title.toLowerCase().includes(searchLower) ||
      pos.organization.name.toLowerCase().includes(searchLower)
    );
  });

  const groupedEmployment = groupPositionsByYear(sortPositionsDescending(employmentHistory));
  const groupedOther = groupPositionsByYear(sortPositionsDescending(filteredOtherPositions));

  return (
    <div className="flex gap-2 p-4 min-h-screen">
      {/* Employment History Column */}
      <div 
        className="flex"
        style={getColumnStyles('employment')}
      >
        <div className="w-40 pr-4 flex-shrink-0">
          <div className="sticky top-4">
            <h4 className="text-base font-semibold mb-2 text-gray-600">On this page</h4>
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

          {groupedEmployment.map(([year, positions]) => (
            <div key={year} id={`eh-year-${year}`} className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{year}</h3>
              {positions.map(position => (
                <PositionCard
                  key={position.positionUuid}
                  position={position}
                  isEmploymentHistory={true}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Other Positions Column */}
      <div 
        className="flex ml-auto"
        style={getColumnStyles('other')}
      >
        <div className="w-40 pr-4 flex-shrink-0">
          <div className="sticky top-4">
            <h4 className="text-base font-semibold mb-2 text-gray-600">On this page</h4>
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

          <SearchBar 
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm} 
          />

          {groupedOther.map(([year, positions]) => (
            <div key={year} id={`other-year-${year}`} className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{year}</h3>
              {positions.map(position => (
                <PositionCard
                  key={position.positionUuid}
                  position={position}
                  isEmploymentHistory={false}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const groupPositionsByYear = (positions: Position[]): [number, Position[]][] => {
  const map = new Map<number, Position[]>();
  positions.forEach(pos => {
    const baseDate = pos.date.endDate || pos.date.startDate;
    const year = new Date(baseDate).getFullYear();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(pos);
  });
  return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
};

const sortPositionsDescending = (positions: Position[]): Position[] => {
  return [...positions].sort((a, b) => {
    const dateA = new Date(a.date.endDate || a.date.startDate).getTime();
    const dateB = new Date(b.date.endDate || b.date.startDate).getTime();
    return dateB - dateA;
  });
};

export default ReviewPositions;
