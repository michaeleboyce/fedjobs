import { useState, useRef } from 'react';
import { FaSave } from 'react-icons/fa';
import { useAutosizeTextArea } from '../../hooks/useAutosizeTextArea';

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
        <button
          onClick={() => onSave(editedText)}
          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
        >
          <FaSave className="mr-1" /> Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}