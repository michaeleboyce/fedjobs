import { useState } from 'react';
import { FaSave } from 'react-icons/fa';
import { Paragraph } from './Paragraph';
import { StreamingTextArray } from '../../types';
import { useParagraphKeyboardShortcuts } from '../../hooks/useParagraphKeyboardShortcuts';

interface DocumentEditorProps {
  streamingTextArray: StreamingTextArray;
  isStreamingComplete: boolean;
  onSave: (paragraphs: StreamingTextArray) => void;
  saveResult?: { url: string; message: string };
  onRegenerateParagraph: (paragraphId?: number, regenerationText?: string) => Promise<void>;
  onSelectParagraph: (paragraphId: number) => void;
  onParagraphTextUpdate: (paragraphId: number, newText: string) => void;
  onParagraphDelete: (id: number) => void;
  onMoveParagraph: (id: number, direction: 'up' | 'down') => void;
  selectedParagraph?: number | null;
}

export function DocumentEditor({
  streamingTextArray,
  isStreamingComplete,
  onSave,
  saveResult,
  onRegenerateParagraph,
  onSelectParagraph,
  onParagraphTextUpdate,
  onParagraphDelete,
  onMoveParagraph,
  selectedParagraph,
}: DocumentEditorProps) {
  // State
  const [editingParagraphId, setEditingParagraphId] = useState<number | null>(null);
  const [regeneratingParagraphId, setRegeneratingParagraphId] = useState<number | null>(null);
  
  // Navigation
  const navigateParagraph = (direction: 'up' | 'down') => {
    if (!streamingTextArray.length || selectedParagraph === null) return;
    
    const currentIndex = streamingTextArray.findIndex(p => p.id === selectedParagraph);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'up') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(streamingTextArray.length - 1, currentIndex + 1);
    }
    
    const newParagraphId = streamingTextArray[newIndex].id;
    onSelectParagraph(newParagraphId);
  };
  
  // Edit mode
  const handleEditClick = (paragraphId: number) => {
    setEditingParagraphId(paragraphId);
    setRegeneratingParagraphId(null);
    onSelectParagraph(paragraphId);
  };
  
  // Regenerate mode
  const handleRegenerateClick = (paragraphId: number) => {
    setRegeneratingParagraphId(paragraphId);
    setEditingParagraphId(null);
    onSelectParagraph(paragraphId);
  };
  
  // Save edit
  const handleSaveEdit = (newText: string) => {
    if (editingParagraphId !== null) {
      onParagraphTextUpdate(editingParagraphId, newText);
      setEditingParagraphId(null);
    }
  };
  
  // Submit regeneration
  const handleSubmitRegenerate = (regenerationText: string) => {
    if (regeneratingParagraphId !== null && regenerationText.trim()) {
      onRegenerateParagraph(regeneratingParagraphId, regenerationText);
      setRegeneratingParagraphId(null);
    }
  };
  
  // Cancel operations
  const handleCancelEdit = () => {
    setEditingParagraphId(null);
  };
  
  const handleCancelRegenerate = () => {
    setRegeneratingParagraphId(null);
  };
  
  // Register keyboard shortcuts
  useParagraphKeyboardShortcuts({
    editMode: editingParagraphId !== null,
    regenerateMode: regeneratingParagraphId !== null,
    selectedParagraphId: selectedParagraph ?? null, // Use nullish coalescing to ensure we never pass undefined
    paragraphs: streamingTextArray,
    onNavigateParagraph: navigateParagraph,
    onEditClick: handleEditClick,
    onRegenerateClick: handleRegenerateClick,
    onDeleteParagraph: onParagraphDelete,
    onSaveDocument: () => onSave(streamingTextArray),
    onMoveParagraph: onMoveParagraph
  });

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Generated Document</h2>
        
        {isStreamingComplete && (
          <div className="flex space-x-2">
            <button
              onClick={() => onSave(streamingTextArray)}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
            >
              <FaSave className="mr-1" /> Save
            </button>
          </div>
        )}
      </div>
      
      {saveResult?.message && (
        <div className="save-success-message mb-4">
          {saveResult.url ? (
            <a href={saveResult.url} target="_blank" rel="noopener noreferrer">
              {saveResult.message}
            </a>
          ) : (
            saveResult.message
          )}
          <button onClick={() => {}}>×</button>
        </div>
      )}

      <div className="relative min-h-[400px] mb-4">
        {streamingTextArray.length > 0 ? (
          <div className="space-y-4">
            {streamingTextArray.map((paragraph) => (
              <Paragraph
                key={paragraph.id}
                paragraph={paragraph}
                isSelected={selectedParagraph === paragraph.id}
                isEditMode={editingParagraphId === paragraph.id}
                isRegenerateMode={regeneratingParagraphId === paragraph.id}
                isStreamingComplete={isStreamingComplete}
                
                onParagraphClick={onSelectParagraph}
                onEditClick={handleEditClick}
                onRegenerateClick={handleRegenerateClick}
                onDeleteParagraph={onParagraphDelete}
                onMoveParagraph={onMoveParagraph}
                
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onSubmitRegenerate={handleSubmitRegenerate}
                onCancelRegenerate={handleCancelRegenerate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-10">
            The generated content will appear here...
          </div>
        )}
        
        {/* Loading indicator */}
        {!isStreamingComplete && streamingTextArray.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-blue-100 text-blue-800 text-center">
            Generating content...
          </div>
        )}
      </div>
      
      {/* Navigation controls */}
      {selectedParagraph !== null && isStreamingComplete && !editingParagraphId && !regeneratingParagraphId && (
        <div className="border-t border-gray-200 pt-4 flex justify-center">
          <div className="flex space-x-4">
            <button
              onClick={() => navigateParagraph('up')}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1"
              disabled={streamingTextArray.findIndex(p => p.id === selectedParagraph) === 0}
            >
              <span>↑ Previous Paragraph</span>
            </button>
            <button
              onClick={() => navigateParagraph('down')}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1"
              disabled={streamingTextArray.findIndex(p => p.id === selectedParagraph) === streamingTextArray.length - 1}
            >
              <span>↓ Next Paragraph</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}