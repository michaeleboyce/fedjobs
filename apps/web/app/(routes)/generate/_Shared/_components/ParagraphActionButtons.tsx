import React from 'react';
import { FaEdit, FaRedo, FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface ParagraphActionButtonsProps {
  onEdit: (e: React.MouseEvent) => void;
  onRegenerate: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveUp: (e: React.MouseEvent) => void;
  onMoveDown: (e: React.MouseEvent) => void;
}

/**
 * Component for paragraph action buttons (edit, regenerate, delete, move)
 */
const ParagraphActionButtons: React.FC<ParagraphActionButtonsProps> = ({
  onEdit,
  onRegenerate,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  return (
    <div className="absolute right-2 top-2 flex space-x-1 bg-white bg-opacity-90 p-1 rounded-md shadow-sm z-10">
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        title="Edit paragraph"
      >
        <FaEdit size={14} />
      </button>
      <button
        onClick={onRegenerate}
        className="p-1.5 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
        title="Regenerate paragraph"
      >
        <FaRedo size={14} />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
        title="Delete paragraph"
      >
        <FaTrash size={14} />
      </button>
      <button
        onClick={onMoveUp}
        className="p-1.5 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        title="Move paragraph up"
      >
        <FaArrowUp size={14} />
      </button>
      <button
        onClick={onMoveDown}
        className="p-1.5 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        title="Move paragraph down"
      >
        <FaArrowDown size={14} />
      </button>
    </div>
  );
};

export default ParagraphActionButtons;