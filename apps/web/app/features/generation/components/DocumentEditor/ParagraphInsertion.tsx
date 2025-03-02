import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { Button } from '@/app/shared/components/ui/Button';
import Card from '@/app/shared/components/ui/Card';
import { cn } from '@/app/shared/utils/classNames';

interface ParagraphInsertionProps {
  index: number;
  onClick: () => void;
  isDialogOpen: boolean;
  onInsert: (index: number, text: string, useAI: boolean) => void;
  onCancel: () => void;
}

export function ParagraphInsertion({
  index,
  onClick,
  isDialogOpen,
  onInsert,
  onCancel
}: ParagraphInsertionProps) {
  const [text, setText] = useState('');
  const [insertMode, setInsertMode] = useState<'manual' | 'ai'>('manual');
  
  const handleInsert = () => {
    onInsert(index, text, insertMode === 'ai');
    setText('');
    setInsertMode('manual');
  };
  
  const handleCancel = () => {
    setText('');
    setInsertMode('manual');
    onCancel();
  };
  
  return (
    <div className="relative py-1">
      {/* The insertion indicator */}
      <div 
        className={cn(
          "flex items-center justify-center h-4 my-1 transition-opacity group cursor-pointer",
          "hover:opacity-100",
          isDialogOpen ? "opacity-0 pointer-events-none" : "opacity-30"
        )}
        onClick={onClick}
      >
        <div className="w-full h-px bg-gray-300 group-hover:bg-blue-400"></div>
        <div className="absolute bg-white p-1 rounded-full border border-gray-300 group-hover:border-blue-400 group-hover:text-blue-500">
          <FaPlus size={12} />
        </div>
      </div>
      
      {/* Dialog for inserting a new paragraph */}
      {isDialogOpen && (
        <Card className="absolute z-10 w-full shadow-lg mt-2">
          <Card.Header>
            <h3 className="text-lg font-medium">Insert New Paragraph</h3>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  variant={insertMode === 'manual' ? 'primary' : 'secondary'}
                  onClick={() => setInsertMode('manual')}
                >
                  Write Manually
                </Button>
                <Button 
                  variant={insertMode === 'ai' ? 'primary' : 'secondary'}
                  onClick={() => setInsertMode('ai')}
                >
                  AI Generated
                </Button>
              </div>
              
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={insertMode === 'manual' 
                  ? "Enter your paragraph text here..."
                  : "Describe what you want the AI to generate..."}
                className="w-full p-2 border border-gray-300 rounded min-h-24 focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
              />
              
              <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleInsert}
                  disabled={!text.trim()}
                >
                  {insertMode === 'manual' ? 'Insert' : 'Generate & Insert'}
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}