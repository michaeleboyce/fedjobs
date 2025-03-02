// File path: apps/web/app/features/generation/components/DocumentEditor/Paragraph.tsx
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical } from 'react-icons/fa';
import { ParagraphContent } from './ParagraphContent';
import { ParagraphEditForm } from './ParagraphEditForm';
import { ParagraphRegenerateForm } from './ParagraphRegenerateForm';
import { ParagraphControls } from './ParagraphControls'

interface ParagraphProps {
  paragraph: {
    id: number;
    text: string;
  };
  isSelected: boolean;
  isEditMode: boolean;
  isRegenerateMode: boolean;
  isStreamingComplete: boolean;
  
  onParagraphClick: (id: number) => void;
  onEditClick: (id: number) => void;
  onRegenerateClick: (id: number) => void;
  onDeleteParagraph: (id: number) => void;
  onMoveParagraph: (id: number, direction: 'up' | 'down') => void;
  
  onSaveEdit: (newText: string) => void;
  onCancelEdit: () => void;
  onSubmitRegenerate: (regenerationText: string) => void;
  onCancelRegenerate: () => void;
}

export function Paragraph({
  paragraph,
  isSelected,
  isEditMode,
  isRegenerateMode,
  isStreamingComplete,
  
  onParagraphClick,
  onEditClick,
  onRegenerateClick,
  onDeleteParagraph,
  onMoveParagraph,
  
  onSaveEdit,
  onCancelEdit,
  onSubmitRegenerate,
  onCancelRegenerate,
}: ParagraphProps) {
  const [hoveredParagraph, setHoveredParagraph] = useState(false);

  // Setup sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: paragraph.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative p-3 rounded-md transition-colors group ${
        isDragging 
          ? 'bg-blue-100 opacity-75 cursor-grabbing' 
          : isSelected 
            ? 'bg-blue-50 border border-blue-200' 
            : hoveredParagraph 
              ? 'bg-gray-50' 
              : 'hover:bg-gray-50'
      }`}
      onClick={() => onParagraphClick(paragraph.id)}
      onMouseEnter={() => setHoveredParagraph(true)}
      onMouseLeave={() => setHoveredParagraph(false)}
    >
      {/* Drag handle */}
      {isStreamingComplete && !isEditMode && !isRegenerateMode && (
        <div 
          {...attributes} 
          {...listeners}
          className="absolute left-1 top-1/2 transform -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <FaGripVertical className="text-gray-400 hover:text-gray-600" />
        </div>
      )}

      {/* Action buttons */}
      {isStreamingComplete && (hoveredParagraph || isSelected) && 
        !isEditMode && !isRegenerateMode && (
        <ParagraphControls
          onEdit={(e) => {
            e.stopPropagation();
            onEditClick(paragraph.id);
          }}
          onRegenerate={(e) => {
            e.stopPropagation();
            onRegenerateClick(paragraph.id);
          }}
          onDelete={(e) => {
            e.stopPropagation();
            onDeleteParagraph(paragraph.id);
          }}
          onMoveUp={(e) => {
            e.stopPropagation();
            onMoveParagraph(paragraph.id, 'up');
          }}
          onMoveDown={(e) => {
            e.stopPropagation();
            onMoveParagraph(paragraph.id, 'down');
          }}
        />
      )}
      
      {/* Paragraph content with left padding for the drag handle */}
      <div className="pl-5">
        {isEditMode ? (
          <ParagraphEditForm
            text={paragraph.text}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          />
        ) : isRegenerateMode ? (
          <ParagraphRegenerateForm
            text={paragraph.text}
            onRegenerate={onSubmitRegenerate}
            onCancel={onCancelRegenerate}
          />
        ) : (
          <ParagraphContent text={paragraph.text} />
        )}
      </div>
    </div>
  );
}