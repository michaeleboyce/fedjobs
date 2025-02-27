// File path: apps/web/app/_components/PositionCard/PositionHeader.tsx
import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPencil, 
  faPlus, 
  faTrash, 
  faChevronDown, 
  faChevronUp, 
  faCheck 
} from "@fortawesome/free-solid-svg-icons";

const buttonBase = "inline-flex items-center gap-1 text-sm px-2 py-1 rounded";
const buttonClasses = {
  primary: `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`,
  secondary: `${buttonBase} bg-gray-100 text-gray-700 hover:bg-gray-200`,
  danger: `${buttonBase} bg-red-600 text-white hover:bg-red-700`,
  success: `${buttonBase} bg-green-600 text-white hover:bg-green-700`,
  link: "text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
};

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
          {isEditing ? (
            // Title editing can be handled in PositionEditForm or here if needed
            <>{position.title.title}</>
          ) : (
            position.title.title
          )}
        </h3>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex gap-1">
            {!isEditing && !isEmploymentHistory && (
              <button
                onClick={onAddToEmploymentHistory}
                disabled={isLoading}
                className={buttonClasses.primary}
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                <span>Create Employment History Position</span>
              </button>
            )}
            {!isEditing && isEmploymentHistory && !isGenerationView && (
              <button
                onClick={onRemoveFromEmploymentHistory}
                disabled={isLoading}
                className={buttonClasses.danger}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                <span>Remove</span>
              </button>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={onSaveEdit}
                  disabled={isLoading}
                  className={buttonClasses.success}
                >
                  <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                  <span>Save</span>
                </button>
                <button
                  onClick={onCancelEdit}
                  className={buttonClasses.secondary}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={onEditToggle}
                className={buttonClasses.secondary}
              >
                <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onExpandToggle}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1 text-sm"
            >
              <FontAwesomeIcon 
                icon={isExpanded ? faChevronUp : faChevronDown} 
                className="h-4 w-4" 
              />
              <span>{isExpanded ? "Hide" : "Expand"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
