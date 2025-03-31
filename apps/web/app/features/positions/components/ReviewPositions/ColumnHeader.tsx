// File path: apps/web/app/features/positions/components/ReviewPositions/ColumnHeader.tsx
import React from 'react';
import { ColumnToggle } from './ColumnToggle';
import { SearchBar } from '@/app/shared/components/SearchBar';

interface ColumnHeaderProps {
  title: string;
  toggleColumn: () => void;
  isExpanded: boolean;
  showFilter?: boolean;
  filterChecked?: boolean;
  onFilterChange?: () => void;
  showSearch?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  title,
  toggleColumn,
  isExpanded,
  showFilter = false,
  filterChecked = false,
  onFilterChange,
  showSearch = false,
  searchTerm = '',
  onSearchChange,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-gray-50 pb-2">
      <h2 className="text-xl font-bold text-blue-700 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="flex justify-between items-center mt-2">
        {showFilter && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="unreviewedOnly"
              checked={filterChecked}
              onChange={onFilterChange}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="unreviewedOnly" className="text-sm text-gray-700">
              Show only unreviewed positions
            </label>
          </div>
        )}
        <ColumnToggle
          isExpanded={isExpanded}
          onToggle={toggleColumn}
          label={title}
        />
      </div>
      {showSearch && onSearchChange && (
        <div className="mt-2">
          <SearchBar searchTerm={searchTerm} onSearchChange={onSearchChange} />
        </div>
      )}
    </div>
  );
};
