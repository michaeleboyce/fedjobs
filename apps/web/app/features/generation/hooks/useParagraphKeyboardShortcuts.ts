// File path: apps/web/app/features/generation/hooks/useParagraphKeyboardShortcuts.ts
import { useEffect } from 'react';
import { StreamingTextArray } from '../types';

interface UseParagraphKeyboardShortcutsProps {
  editMode: boolean;
  regenerateMode: boolean;
  selectedParagraphId: number | null;
  paragraphs: StreamingTextArray;
  onNavigateParagraph: (direction: 'up' | 'down') => void;
  onEditClick: (id: number) => void;
  onRegenerateClick: (id: number) => void;
  onDeleteParagraph: (id: number) => void;
  onSaveDocument: () => void;
  onMoveParagraph: (id: number, direction: 'up' | 'down') => void;
}

/**
 * Custom hook for handling keyboard shortcuts in paragraph editing
 */
export function useParagraphKeyboardShortcuts({
  editMode,
  regenerateMode,
  selectedParagraphId,
  paragraphs,
  onNavigateParagraph,
  onEditClick,
  onRegenerateClick,
  onDeleteParagraph,
  onSaveDocument,
  onMoveParagraph,
}: UseParagraphKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editMode || regenerateMode) return; // Don't handle shortcuts in edit/regenerate mode
      
      // Navigation shortcuts
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigateParagraph('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigateParagraph('down');
      } 
      
      // Action shortcuts (only when a paragraph is selected)
      else if (selectedParagraphId !== null) {
        if (e.key === 'e') {
          e.preventDefault();
          onEditClick(selectedParagraphId);
        } else if (e.key === 'r') {
          e.preventDefault();
          onRegenerateClick(selectedParagraphId);
        } else if (e.key === 'd') {
          e.preventDefault();
          onDeleteParagraph(selectedParagraphId);
        } else if (e.key === 'PageUp') {
          e.preventDefault();
          onMoveParagraph(selectedParagraphId, 'up');
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          onMoveParagraph(selectedParagraphId, 'down');
        }
      }
      
      // Global shortcuts
      if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        onSaveDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    editMode, 
    regenerateMode, 
    selectedParagraphId, 
    paragraphs, 
    onNavigateParagraph,
    onEditClick,
    onRegenerateClick,
    onDeleteParagraph,
    onSaveDocument,
    onMoveParagraph
  ]);
}