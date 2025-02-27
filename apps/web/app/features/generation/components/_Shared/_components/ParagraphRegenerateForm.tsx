import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaRedo } from 'react-icons/fa';
import useAutosizeTextArea from '@/app/features/generation/hooks/useAutosizeTextArea';

interface ParagraphRegenerateFormProps {
  text: string;
  onRegenerate: (instructions: string) => void;
  onCancel: () => void;
}

/**
 * Component for handling paragraph regeneration with instructions
 */
const ParagraphRegenerateForm: React.FC<ParagraphRegenerateFormProps> = ({ 
  text, 
  onRegenerate, 
  onCancel 
}) => {
  const [instructions, setInstructions] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Use the shared hook for textarea auto-resizing
  useAutosizeTextArea(textareaRef, instructions);
  
  // Auto-focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);
  
  const handleRegenerate = () => {
    if (instructions.trim()) {
      onRegenerate(instructions);
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="p-3 bg-gray-100 rounded-md">
        <ReactMarkdown components={{
          p: ({children}) => <p className="text-gray-600">{children}</p>
        }}>
          {text}
        </ReactMarkdown>
      </div>
      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm font-medium text-yellow-800 mb-1">
          Provide instructions for regenerating this paragraph:
        </p>
        <textarea
          ref={textareaRef}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Example: Make it more concise and focus on leadership skills."
          className="w-full min-h-[24px] max-h-[150px] p-2 border border-yellow-300 rounded-md focus:border-yellow-500 focus:ring focus:ring-yellow-200 focus:ring-opacity-50 overflow-y-auto resize-none"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={handleRegenerate}
          disabled={!instructions.trim()}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center ${
            instructions.trim() 
              ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
              : 'bg-yellow-300 text-white cursor-not-allowed'
          }`}
        >
          <FaRedo className="mr-1" /> Regenerate
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
};

export default ParagraphRegenerateForm;