// File path: apps/web/app/_components/ReviewPositions/ColumnToggle.tsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpandAlt, faCompressAlt } from "@fortawesome/free-solid-svg-icons";

interface ColumnToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  label: string;
}

export const ColumnToggle: React.FC<ColumnToggleProps> = ({
  isExpanded,
  onToggle,
  label
}) => (
  <button
    onClick={onToggle}
    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
    aria-expanded={isExpanded}
    aria-label={`${isExpanded ?  'Minimize' : 'Expand'  } ${label}`}
  >
    <FontAwesomeIcon 
      icon={isExpanded ? faCompressAlt : faExpandAlt } 
      className="h-4 w-4" 
    />
    <span>{isExpanded ? `Minimize ${label} ` : `Expand ${label}`}</span>
  </button>
);
