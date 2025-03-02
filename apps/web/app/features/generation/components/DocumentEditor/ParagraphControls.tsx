import { FaEdit, FaRedo, FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { Button } from '@/app/shared/components/ui/Button';

interface ParagraphControlsProps {
  onEdit: (e: React.MouseEvent) => void;
  onRegenerate: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveUp: (e: React.MouseEvent) => void;
  onMoveDown: (e: React.MouseEvent) => void;
}

export function ParagraphControls({
  onEdit,
  onRegenerate,
  onDelete,
  onMoveUp,
  onMoveDown
}: ParagraphControlsProps) {
  return (
    <div className="absolute right-2 top-2 flex space-x-1 bg-white bg-opacity-90 p-1 rounded-md shadow-sm z-10">
      <Button
        onClick={onEdit}
        variant="primary"
        size="sm"
        className="p-1.5 min-w-0"
        title="Edit paragraph"
        leftIcon={<FaEdit size={14} />}
      />
      <Button
        onClick={onRegenerate}
        variant="primary"
        size="sm"
        className="p-1.5 min-w-0 bg-yellow-600 hover:bg-yellow-700"
        title="Regenerate paragraph"
        leftIcon={<FaRedo size={14} />}
      />
      <Button
        onClick={onDelete}
        variant="danger"
        size="sm"
        className="p-1.5 min-w-0"
        title="Delete paragraph"
        leftIcon={<FaTrash size={14} />}
      />
      <Button
        onClick={onMoveUp}
        variant="secondary"
        size="sm"
        className="p-1.5 min-w-0 bg-gray-600 text-white hover:bg-gray-700"
        title="Move paragraph up"
        leftIcon={<FaArrowUp size={14} />}
      />
      <Button
        onClick={onMoveDown}
        variant="secondary"
        size="sm"
        className="p-1.5 min-w-0 bg-gray-600 text-white hover:bg-gray-700"
        title="Move paragraph down"
        leftIcon={<FaArrowDown size={14} />}
      />
    </div>
  );
}