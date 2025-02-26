// File path: apps/web/app/(routes)/generate/_Shared/StreamingDocumentViewer.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { StreamingTextArray } from '@/app/_types/StreamingTextArray';
import { FaChevronUp, FaChevronDown, FaSave } from 'react-icons/fa';
import DocumentParagraph from './DocumentParagraph';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import useParagraphKeyboardShortcuts from '@/app/_hooks/useParagraphKeyboardShortcuts';

// In StreamingDocumentViewer.tsx, update the interface:

interface StreamingDocumentViewerProps {
  documentName?: string;
  saveResult?: { url: string; message: string };
  streamingTextArray: StreamingTextArray;
  isStreamingComplete: boolean;
  // Update this prop type to accept either string[] or StreamingTextArray
  onSave: (paragraphs: string[] | StreamingTextArray) => void;
  onRegenerateParagraph: (paragraphId: number, regenerationText?: string) => Promise<void>;
  onSelectParagraph: (paragraphId: number) => void;
  onParagraphTextUpdate: (paragraphId: number, newText: string) => void;
  onParagraphDelete: (id: number) => void;
  onMoveParagraph: (id: number, direction: 'up' | 'down') => void;
  selectedParagraph?: number | null;
}

/**
 * Component for displaying streaming document content with paragraph editing capabilities
 */
const StreamingDocumentViewer: React.FC<StreamingDocumentViewerProps> = ({
  streamingTextArray,
  isStreamingComplete,
  onSave,
  onRegenerateParagraph,
  onSelectParagraph,
  onParagraphTextUpdate,
  onParagraphDelete,
  onMoveParagraph
}) => {
  const [selectedParagraphId, setSelectedParagraphId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState(false);
  
  // Set up drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset state when content changes or streaming completes
  useEffect(() => {
    setSelectedParagraphId(null);
    setEditMode(false);
    setRegenerateMode(false);
  }, [isStreamingComplete]);

  const handleParagraphClick = (id: number) => {
    if (isStreamingComplete) {
      // If clicking on already selected paragraph and in edit mode, don't change anything
      if (selectedParagraphId === id && (editMode || regenerateMode)) {
        return;
      }
      
      // If changing paragraphs, exit edit/regenerate mode
      if (selectedParagraphId !== id) {
        setEditMode(false);
        setRegenerateMode(false);
      }
      
      setSelectedParagraphId(id);
      onSelectParagraph(id);
    }
  };

  const handleEditClick = (id: number) => {
    setSelectedParagraphId(id);
    onSelectParagraph(id);
    setRegenerateMode(false);
    setEditMode(true);
  };

  const handleRegenerateClick = (id: number) => {
    setSelectedParagraphId(id);
    onSelectParagraph(id);
    setEditMode(false);
    setRegenerateMode(true);
  };

  const handleSaveEdit = (newText: string) => {
    if (selectedParagraphId !== null) {
      onParagraphTextUpdate(selectedParagraphId, newText);
      setEditMode(false);
    }
  };

  const handleSubmitRegenerate = (regenerationText: string) => {
    if (selectedParagraphId !== null && regenerationText.trim()) {
      onRegenerateParagraph(selectedParagraphId, regenerationText);
      setRegenerateMode(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleCancelRegenerate = () => {
    setRegenerateMode(false);
  };

  const handleDeleteParagraph = (id: number) => {
    const currentIndex = streamingTextArray.findIndex(p => p.id === id);
    onParagraphDelete(id);
    
    // Select an adjacent paragraph if possible
    if (streamingTextArray.length > 1) {
      const newIndex = Math.min(currentIndex, streamingTextArray.length - 2);
      setTimeout(() => {
        if (newIndex >= 0) {
          const newSelectedId = streamingTextArray[newIndex].id;
          setSelectedParagraphId(newSelectedId);
          onSelectParagraph(newSelectedId);
        }
      }, 0);
    } else {
      setSelectedParagraphId(null);
    }
  };

  const handleMoveParagraph = (id: number, direction: 'up' | 'down') => {
    setSelectedParagraphId(id);
    onMoveParagraph(id, direction);
  };

  const handleSaveDocument = () => {
    const paragraphTexts = streamingTextArray.map(p => p.text);
    onSave(paragraphTexts);
  };

  const navigateParagraph = (direction: 'up' | 'down') => {
    if (!streamingTextArray.length || selectedParagraphId === null) return;
    
    const currentIndex = streamingTextArray.findIndex(p => p.id === selectedParagraphId);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'up') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(streamingTextArray.length - 1, currentIndex + 1);
    }
    
    const newParagraphId = streamingTextArray[newIndex].id;
    setSelectedParagraphId(newParagraphId);
    onSelectParagraph(newParagraphId);
  };

  // FIX: Updated handleDragEnd to maintain paragraph IDs and order
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Find original positions
      const oldIndex = streamingTextArray.findIndex(item => item.id === active.id);
      const newIndex = streamingTextArray.findIndex(item => item.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Create a new array with the reordered paragraphs
        const reorderedArray = arrayMove([...streamingTextArray], oldIndex, newIndex);
        
        // Send the entire reordered StreamingTextArray to the parent
        onSave(reorderedArray);
        
        // Update the selected paragraph if needed
        if (selectedParagraphId === active.id) {
          setSelectedParagraphId(active.id as number);
        }
      }
    }
  }

  // Use our custom hook for keyboard shortcuts
  useParagraphKeyboardShortcuts({
    editMode,
    regenerateMode,
    selectedParagraphId,
    paragraphs: streamingTextArray,
    onNavigateParagraph: navigateParagraph,
    onEditClick: handleEditClick,
    onRegenerateClick: handleRegenerateClick,
    onDeleteParagraph: handleDeleteParagraph,
    onSaveDocument: handleSaveDocument,
    onMoveParagraph: handleMoveParagraph
  });

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Generated Document</h2>
        {isStreamingComplete && (
          <div className="flex space-x-2">
            <button
              onClick={handleSaveDocument}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
            >
              <FaSave className="mr-1" /> Save
            </button>
          </div>
        )}
      </div>

      <div className="relative min-h-[400px] mb-4">
        {streamingTextArray.length > 0 ? (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={streamingTextArray.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {streamingTextArray.map((paragraph) => (
                  <DocumentParagraph
                    key={paragraph.id}
                    paragraph={paragraph}
                    isSelected={selectedParagraphId === paragraph.id}
                    isStreamingComplete={isStreamingComplete}
                    isEditMode={editMode && selectedParagraphId === paragraph.id}
                    isRegenerateMode={regenerateMode && selectedParagraphId === paragraph.id}
                    onParagraphClick={handleParagraphClick}
                    onEditClick={handleEditClick}
                    onRegenerateClick={handleRegenerateClick}
                    onDeleteParagraph={handleDeleteParagraph}
                    onMoveParagraph={handleMoveParagraph}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onSubmitRegenerate={handleSubmitRegenerate}
                    onCancelRegenerate={handleCancelRegenerate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
      
      {/* Main navigation controls (previous/next paragraph) */}
      {selectedParagraphId !== null && isStreamingComplete && !editMode && !regenerateMode && (
        <div className="border-t border-gray-200 pt-4 flex justify-center">
          <div className="flex space-x-4">
            <button
              onClick={() => navigateParagraph('up')}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1"
              disabled={streamingTextArray.findIndex(p => p.id === selectedParagraphId) === 0}
            >
              <FaChevronUp className="mr-1" /> Previous Paragraph
            </button>
            <button
              onClick={() => navigateParagraph('down')}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1"
              disabled={streamingTextArray.findIndex(p => p.id === selectedParagraphId) === streamingTextArray.length - 1}
            >
              <FaChevronDown className="mr-1" /> Next Paragraph
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingDocumentViewer;