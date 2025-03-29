// File path: apps/web/app/features/generation/components/DocumentEditor/index.tsx
import { useState, useCallback } from "react";
import { FaSave, FaKeyboard } from "react-icons/fa";
import { Paragraph } from "./Paragraph";
import { ShortcutGuide } from "./ShortcutGuide";
import { ParagraphInsertion } from "./ParagraphInsertion";
import { StreamingTextArray } from "@fedjobs/types";
import { useParagraphKeyboardShortcuts } from "@/app/features/generation/hooks/useParagraphKeyboardShortcuts";
import { Button } from "@/app/shared/components/ui/Button";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

interface DocumentEditorProps {
  streamingTextArray: StreamingTextArray;
  isStreamingComplete: boolean;
  onSave: (paragraphs: StreamingTextArray) => void;
  saveResult?: { url: string; message: string };
  onRegenerateParagraph: (
    paragraphId?: number,
    regenerationText?: string
  ) => Promise<void>;
  onSelectParagraph: (paragraphId: number) => void;
  onParagraphTextUpdate: (paragraphId: number, newText: string) => void;
  onParagraphDelete: (id: number) => void;
  onMoveParagraph: (id: number, direction: "up" | "down") => void;
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
  const [editingParagraphId, setEditingParagraphId] = useState<number | null>(
    null
  );
  const [regeneratingParagraphId, setRegeneratingParagraphId] = useState<
    number | null
  >(null);
  const [insertionDialogOpen, setInsertionDialogOpen] = useState<number | null>(
    null
  );
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Configure DnD sensors - using PointerSensor to improve drag behavior
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Only start dragging after moving 8px to avoid accidental drags
      },
    })
  );

  // Handle drag end event
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = streamingTextArray.findIndex(
          (p) => p.id === active.id
        );
        const newIndex = streamingTextArray.findIndex((p) => p.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(streamingTextArray, oldIndex, newIndex);
          onSave(newOrder);
        }
      }
    },
    [streamingTextArray, onSave]
  );

  // Navigation
  const navigateParagraph = (direction: "up" | "down") => {
    if (!streamingTextArray.length || selectedParagraph === null) return;

    const currentIndex = streamingTextArray.findIndex(
      (p) => p.id === selectedParagraph
    );
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === "up") {
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
    // Only proceed if we have a valid paragraph ID and non-empty text
    const trimmedText = regenerationText.trim();
    if (regeneratingParagraphId !== null && trimmedText.length > 0) {
      onRegenerateParagraph(regeneratingParagraphId, trimmedText);
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

  // Handle paragraph insertion
  const handleInsertClick = (index: number) => {
    setInsertionDialogOpen(index);
  };

  const handleInsertParagraph = (
    index: number,
    text: string,
    useAI: boolean
  ) => {
    // Create a new ID for the paragraph
    const newId = Math.max(0, ...streamingTextArray.map((p) => p.id)) + 1;

    if (useAI) {
      // For AI generation, insert a placeholder and then regenerate it
      const newParagraph = { id: newId, text: "Generating..." };
      const newArray = [
        ...streamingTextArray.slice(0, index),
        newParagraph,
        ...streamingTextArray.slice(index),
      ];

      // First update the array
      onSave(newArray);

      // Then trigger AI regeneration with the provided text as prompt
      setTimeout(() => {
        onRegenerateParagraph(newId, text);
      }, 100);
    } else {
      // For manual entry, just insert the new paragraph
      const newParagraph = { id: newId, text };
      const newArray = [
        ...streamingTextArray.slice(0, index),
        newParagraph,
        ...streamingTextArray.slice(index),
      ];

      onSave(newArray);
    }

    // Close the dialog
    setInsertionDialogOpen(null);
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
    onMoveParagraph: onMoveParagraph,
  });

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Generated Document</h2>

        <div className="flex space-x-2">
          {isStreamingComplete && (
            <>
              <Button
                onClick={() => setShowShortcuts(true)}
                variant="secondary"
                leftIcon={<FaKeyboard />}
                className="mr-2"
              >
                Keyboard Shortcuts
              </Button>
              <Button
                onClick={() => onSave(streamingTextArray)}
                variant="primary"
                leftIcon={<FaSave />}
                className="bg-green-600 hover:bg-green-700"
              >
                Save
              </Button>
            </>
          )}
        </div>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}}
            className="p-0.5 min-h-0 min-w-0"
          >
            ×
          </Button>
        </div>
      )}

      <div className="relative min-h-[400px] mb-4">
        {streamingTextArray.length > 0 ? (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={streamingTextArray.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {/* First insertion point */}
                <ParagraphInsertion
                  index={0}
                  onClick={() => handleInsertClick(0)}
                  isDialogOpen={insertionDialogOpen === 0}
                  onInsert={handleInsertParagraph}
                  onCancel={() => setInsertionDialogOpen(null)}
                />

                {streamingTextArray.map((paragraph, index) => (
                  <div key={paragraph.id} className="relative">
                    <Paragraph
                      paragraph={paragraph}
                      isSelected={selectedParagraph === paragraph.id}
                      isEditMode={editingParagraphId === paragraph.id}
                      isRegenerateMode={
                        regeneratingParagraphId === paragraph.id
                      }
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

                    {/* Insertion point after each paragraph */}
                    <ParagraphInsertion
                      index={index + 1}
                      onClick={() => handleInsertClick(index + 1)}
                      isDialogOpen={insertionDialogOpen === index + 1}
                      onInsert={handleInsertParagraph}
                      onCancel={() => setInsertionDialogOpen(null)}
                    />
                  </div>
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

      {/* Navigation controls */}
      {selectedParagraph !== null &&
        isStreamingComplete &&
        !editingParagraphId &&
        !regeneratingParagraphId && (
          <div className="border-t border-gray-200 pt-4 flex justify-center">
            <div className="flex space-x-4">
              <Button
                onClick={() => navigateParagraph("up")}
                variant="secondary"
                size="sm"
                disabled={
                  streamingTextArray.findIndex(
                    (p) => p.id === selectedParagraph
                  ) === 0
                }
                leftIcon={<span>↑</span>}
              >
                Previous Paragraph
              </Button>
              <Button
                onClick={() => navigateParagraph("down")}
                variant="secondary"
                size="sm"
                disabled={
                  streamingTextArray.findIndex(
                    (p) => p.id === selectedParagraph
                  ) ===
                  streamingTextArray.length - 1
                }
                rightIcon={<span>↓</span>}
              >
                Next Paragraph
              </Button>
            </div>
          </div>
        )}
      <ShortcutGuide
        isVisible={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
