// apps/web/app/features/generation/hooks/useDocumentEditor.ts
import { useState, useCallback } from 'react';
import { StreamingTextArray } from '../types';

export function useDocumentEditor() {
  // Document state
  const [streamingTextArray, setStreamingTextArray] = useState<StreamingTextArray>([]);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);
  const [selectedParagraphId, setSelectedParagraphId] = useState<number | null>(null);
  const [saveResult, setSaveResult] = useState({ url: "", message: "" });
  const [generatedDocuments, setGeneratedDocuments] = useState<any[]>([]);
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState(false);
  
  // Reset editor state
  const resetEditor = useCallback(() => {
    setStreamingTextArray([]);
    setIsStreamingComplete(false);
    setSelectedParagraphId(null);
    setEditMode(false);
    setRegenerateMode(false);
  }, []);
  
  // Complete streaming
  const completeEditing = useCallback(() => {
    setIsStreamingComplete(true);
  }, []);
  
  // Update content
  const updateContent = useCallback((content: string, paragraphId?: number) => {
    if (paragraphId !== undefined) {
      // Update specific paragraph
      setStreamingTextArray((prev) =>
        prev.map((p) => (p.id === paragraphId ? { ...p, text: content } : p))
      );
    } else {
      // Update entire document
      const paragraphs = content
        .split(/\n\s*\n+/)
        .map((txt, idx) => ({ id: idx, text: txt.trim() }));
      setStreamingTextArray(paragraphs);
    }
  }, []);
  
  // Paragraph selection
  const handleParagraphSelection = useCallback((paragraphId: number) => {
    setSelectedParagraphId(paragraphId);
  }, []);
  
  // Edit mode handlers
  const handleEditClick = useCallback((paragraphId: number) => {
    setSelectedParagraphId(paragraphId);
    setRegenerateMode(false);
    setEditMode(true);
  }, []);
  
  const handleRegenerateClick = useCallback((paragraphId: number) => {
    setSelectedParagraphId(paragraphId);
    setEditMode(false);
    setRegenerateMode(true);
  }, []);
  
  // Paragraph updates
  const handleParagraphTextUpdate = useCallback((paragraphId: number, newText: string) => {
    setStreamingTextArray(prev => 
      prev.map(p => p.id === paragraphId ? { ...p, text: newText } : p)
    );
    setEditMode(false);
  }, []);
  
  // Paragraph deletion
  const handleParagraphDelete = useCallback((paragraphId: number) => {
    setStreamingTextArray(prev => prev.filter(p => p.id !== paragraphId));
    if (selectedParagraphId === paragraphId) {
      setSelectedParagraphId(null);
    }
  }, [selectedParagraphId]);
  
  // Paragraph movement
  const handleParagraphMove = useCallback((paragraphId: number, direction: 'up' | 'down') => {
    setStreamingTextArray(prev => {
      const index = prev.findIndex(p => p.id === paragraphId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? Math.max(0, index - 1) : Math.min(prev.length - 1, index + 1);
      if (newIndex === index) return prev;
      
      const result = [...prev];
      const [movedItem] = result.splice(index, 1);
      result.splice(newIndex, 0, movedItem);
      return result;
    });
  }, []);
  
  // Paragraph reordering
  const handleParagraphReorder = useCallback((data: string[] | StreamingTextArray) => {
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      setStreamingTextArray(data as StreamingTextArray);
    }
  }, []);
  
  // Return all editor state and handlers
  return {
    streamingTextArray,
    isStreamingComplete,
    selectedParagraphId,
    saveResult,
    generatedDocuments,
    editMode,
    regenerateMode,
    
    // Add direct access to setState
    setStreamingTextArray, // <-- Add this
    
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
    
    setSaveResult,
    setGeneratedDocuments,
  };
}