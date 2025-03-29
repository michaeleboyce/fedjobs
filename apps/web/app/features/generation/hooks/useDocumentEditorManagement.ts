// File path: apps/web/app/features/generation/hooks/useDocumentEditorManagement.ts
'use client';

import { useDocumentEditorStore } from '@/app/store/documentEditorStore';
import { StreamingTextArray } from '@fedjobs/types';

/**
 * Hook for managing document editor state using Zustand store
 * Provides a clean API for components to interact with the document editor
 */
export function useDocumentEditorManagement() {
  const {
    // State
    streamingTextArray,
    isStreamingComplete,
    selectedParagraphId,
    saveResult,
    generatedDocuments,
    editMode,
    regenerateMode,
    
    // Actions
    setStreamingTextArray,
    setIsStreamingComplete,
    setSaveResult,
    setGeneratedDocuments,
    
    // Complex actions
    resetEditor,
    completeEditing,
    updateContent,
    handleParagraphSelection,
    handleEditClick,
    handleRegenerateClick,
    handleParagraphTextUpdate,
    handleParagraphDelete,
    handleParagraphMove,
    handleParagraphReorder,
  } = useDocumentEditorStore();

  /**
   * Updates the editor with streaming text and marks as complete when done
   */
  const updateStreamingText = (newText: StreamingTextArray, isDone: boolean = false) => {
    setStreamingTextArray(newText);
    if (isDone) {
      setIsStreamingComplete(true);
    }
  };

  /**
   * Selects a paragraph and sets the appropriate edit mode
   */
  const selectParagraphForEditing = (paragraphId: number) => {
    handleEditClick(paragraphId);
  };

  /**
   * Selects a paragraph for regeneration
   */
  const selectParagraphForRegeneration = (paragraphId: number) => {
    handleRegenerateClick(paragraphId);
  };

  return {
    // State
    streamingTextArray,
    isStreamingComplete,
    selectedParagraphId,
    saveResult,
    generatedDocuments,
    editMode,
    regenerateMode,
    
    // Enhanced actions
    updateStreamingText,
    selectParagraphForEditing,
    selectParagraphForRegeneration,
    
    // Original actions
    resetEditor,
    completeEditing,
    updateContent,
    handleParagraphSelection,
    handleParagraphTextUpdate,
    handleParagraphDelete,
    handleParagraphMove,
    handleParagraphReorder,
    
    // Direct state setters
    setStreamingTextArray,
    setIsStreamingComplete,
    setSaveResult,
    setGeneratedDocuments,
  };
}