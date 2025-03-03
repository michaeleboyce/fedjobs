import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencil, faPlus, faTrash, faChevronDown, faChevronUp, faCheck } from "@fortawesome/free-solid-svg-icons";
import { Button } from '@/app/shared/components/ui/Button';

interface PositionHeaderProps {
  isEditing: boolean;
  isEmploymentHistory: boolean;
  isGenerationView: boolean;
  isLoading: boolean;
  isExpanded: boolean;
  position: any;
  onAddToEmploymentHistory: () => void;
  onRemoveFromEmploymentHistory: () => void;
  onEditToggle: () => void;
  onExpandToggle: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export const PositionHeader: React.FC<PositionHeaderProps> = ({
  isEditing,
  isEmploymentHistory,
  isGenerationView,
  isLoading,
  isExpanded,
  position,
  onAddToEmploymentHistory,
  onRemoveFromEmploymentHistory,
  onEditToggle,
  onExpandToggle,
  onSaveEdit,
  onCancelEdit
}) => {
  return (
    <div className="flex justify-between items-start gap-4">
      <div className="flex-1">
        <h3 className="font-bold text-xl">
          {isEditing ? position.title.title : position.title.title}
        </h3>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex gap-1">
            {!isEditing && !isEmploymentHistory && (
              <Button
                variant="primary"
                size="sm"
                onClick={onAddToEmploymentHistory}
                disabled={isLoading}
                leftIcon={<FontAwesomeIcon icon={faPlus} className="h-3 w-3" />}
              >
                <span>Create Employment History Position</span>
              </Button>
            )}
            {!isEditing && isEmploymentHistory && !isGenerationView && (
              <Button
                variant="danger"
                size="sm"
                onClick={onRemoveFromEmploymentHistory}
                disabled={isLoading}
                leftIcon={<FontAwesomeIcon icon={faTrash} className="h-3 w-3" />}
              >
                <span>Remove</span>
              </Button>
            )}
            {isEditing ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onSaveEdit}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                  leftIcon={<FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                >
                  <span>Save</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onEditToggle}
                leftIcon={<FontAwesomeIcon icon={faPencil} className="h-3 w-3" />}
              >
                <span>Edit</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpandToggle}
              rightIcon={<FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="h-3 w-3" />}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
