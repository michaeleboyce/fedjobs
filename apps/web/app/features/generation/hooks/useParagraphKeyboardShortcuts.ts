import { useEffect } from 'react';
import { StreamingTextArray } from '@/app/features/generation/types/StreamingTextArray';

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
export const useParagraphKeyboardShortcuts = ({
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
}: UseParagraphKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editMode || regenerateMode) return; // Don't handle shortcuts in edit/regenerate mode
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigateParagraph('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigateParagraph('down');
      } else if (e.key === 'e' && selectedParagraphId !== null) {
        e.preventDefault();
        onEditClick(selectedParagraphId);
      } else if (e.key === 'r' && selectedParagraphId !== null) {
        e.preventDefault();
        onRegenerateClick(selectedParagraphId);
      } else if (e.key === 'd' && selectedParagraphId !== null) {
        e.preventDefault();
        onDeleteParagraph(selectedParagraphId);
      } else if (e.key === 's' && e.ctrlKey) {
        e.preventDefault();
        onSaveDocument();
      } else if (e.key === 'PageUp' && selectedParagraphId !== null) {
        e.preventDefault();
        onMoveParagraph(selectedParagraphId, 'up');
      } else if (e.key === 'PageDown' && selectedParagraphId !== null) {
        e.preventDefault();
        onMoveParagraph(selectedParagraphId, 'down');
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
};

export default useParagraphKeyboardShortcuts;