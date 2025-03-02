// File path: apps/web/app/features/generation/components/DocumentEditor/ParagraphEditForm.tsx
import { useState, useRef } from 'react';
import { FaSave } from 'react-icons/fa';
import { useAutosizeTextArea } from '../../hooks/useAutosizeTextArea';
import { Button } from '@/app/shared/components/ui/Button';

interface ParagraphEditFormProps {
  text: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
}

export function ParagraphEditForm({
  text,
  onSave,
  onCancel
}: ParagraphEditFormProps) {
  const [editedText, setEditedText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use the autosize hook
  useAutosizeTextArea(textareaRef, editedText);

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        className="w-full min-h-[24px] max-h-[300px] p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 overflow-y-auto resize-none"
      />
      <div className="flex justify-end space-x-2">
        <Button
          onClick={() => onSave(editedText)}
          variant="primary"
          size="sm"
          leftIcon={<FaSave />}
          className="bg-green-600 hover:bg-green-700"
        >
          Save
        </Button>
        <Button
          onClick={onCancel}
          variant="secondary"
          size="sm"
          className="bg-gray-500 text-white hover:bg-gray-600"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}