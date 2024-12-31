// File path: apps/web/app/_components/Resume/components/DetailsToggle/index.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

/**
 * Props for the DetailsToggle component
 */
interface DetailsToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * DetailsToggle Component
 * Displays a button to toggle the visibility of position details
 * 
 * @component
 */
export const DetailsToggle: React.FC<DetailsToggleProps> = ({
  isOpen,
  onToggle,
}) => {
  return (
    <button
      className="mt-3 font-semibold text-blue-600 hover:underline focus:underline"
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <>
          Close Details <FontAwesomeIcon icon={faChevronUp} className="ml-2" />
        </>
      ) : (
        <>
          View Full Details <FontAwesomeIcon icon={faChevronDown} className="ml-2" />
        </>
      )}
    </button>
  );
}; 