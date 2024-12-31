// File path: apps/web/app/_components/Resume/components/SelectionControls/index.tsx
import React from 'react';

/**
 * Props for the SelectionControls component
 */
interface SelectionControlsProps {
  isViewOnly: boolean;
  totalItems: number;
  isAllSelected: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  onClearAll: () => void;
}

/**
 * SelectionControls Component
 * Displays controls for selecting/deselecting all items in a position
 * 
 * @component
 */
export const SelectionControls: React.FC<SelectionControlsProps> = ({
  isViewOnly,
  totalItems,
  isAllSelected,
  selectedCount,
  onSelectAll,
  onClearAll,
}) => {
  if (isViewOnly || totalItems === 0) return null;

  const selectionLabel = `(${selectedCount} of ${totalItems} selected)`;

  return (
    <div className="selection-controls mt-2">
      {isAllSelected ? (
        <button
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
          onClick={onClearAll}
        >
          Clear All Position Info {selectionLabel}
        </button>
      ) : (
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
          onClick={onSelectAll}
        >
          Select All Position Info {selectionLabel}
        </button>
      )}
    </div>
  );
}; 