// File path: apps/web/app/features/positions/components/ReviewPositions/ColumnToggle.tsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpandAlt, faCompressAlt } from "@fortawesome/free-solid-svg-icons";
import { Button } from '@/app/shared/components/ui/Button';

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
  <Button
    onClick={onToggle}
    variant="secondary"
    size="sm"
    leftIcon={<FontAwesomeIcon icon={isExpanded ? faCompressAlt : faExpandAlt} className="h-4 w-4" />}
    aria-expanded={isExpanded}
    aria-label={`${isExpanded ? 'Minimize' : 'Expand'} ${label}`}
  >
    {isExpanded ? `Minimize ${label}` : `Expand ${label}`}
  </Button>
);
