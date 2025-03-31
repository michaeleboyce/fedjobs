// File path: apps/web/app/features/positions/components/SimilarPositionCard/ActionButtons.tsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import Button from "@/app/shared/components/ui/Button";

interface ActionButtonsProps {
  expanded: boolean;
  isGenerationView: boolean;
  onExpandToggle: () => void;
  onViewOriginal: () => void;
  isLoading: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  expanded,
  isGenerationView,
  onExpandToggle,
  onViewOriginal,
  isLoading,
  onApprove,
  onReject,
  onRemove,
}) => {
  return (
    <div className="flex flex-col space-y-2">
      {!isGenerationView && onApprove && (
        <Button variant="primary" size="sm" onClick={onApprove} isLoading={isLoading}>
          Approve
        </Button>
      )}
      {!isGenerationView && onReject && (
        <Button variant="danger" size="sm" onClick={onReject} isLoading={isLoading}>
          Reject
        </Button>
      )}
      {!isGenerationView && onRemove && (
        <Button variant="warning" size="sm" onClick={onRemove} isLoading={isLoading}>
          Remove
        </Button>
      )}
      {isGenerationView ? (
        <Button variant="secondary" size="sm" onClick={onExpandToggle} rightIcon={<FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="h-4 w-4" />}>
          {expanded ? "Hide" : "Expand"}
        </Button>
      ) : (
        <>
          <Button variant="secondary" size="sm" onClick={onExpandToggle} rightIcon={<FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="h-4 w-4" />}>
            {expanded ? "Hide" : "Expand"}
          </Button>
          <Button variant="secondary" size="sm" onClick={onViewOriginal} leftIcon={<FontAwesomeIcon icon={faEye} className="h-4 w-4" />}>
            Jump To
          </Button>
        </>
      )}
    </div>
  );
};

export default ActionButtons;
