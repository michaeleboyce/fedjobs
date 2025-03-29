// File path: apps/web/app/store/documentEditorStore.ts
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { StreamingTextArray } from '@fedjobs/types';

interface DocumentEditorState {
  streamingTextArray: StreamingTextArray;
  isStreamingComplete: boolean;
  selectedParagraphId: number | null;
  saveResult: { url: string, message: string };
  generatedDocuments: any[];
  editMode: boolean;
  regenerateMode: boolean;
}

interface DocumentEditorActions {
  setStreamingTextArray: (textArray: StreamingTextArray) => void;
  setIsStreamingComplete: (isComplete: boolean) => void;
  setSelectedParagraphId: (id: number | null) => void;
  setSaveResult: (result: { url: string, message: string }) => void;
  setGeneratedDocuments: (documents: any[]) => void;
  setEditMode: (isEditing: boolean) => void;
  setRegenerateMode: (isRegenerating: boolean) => void;
  
  resetEditor: () => void;
  completeEditing: () => void;
  updateContent: (content: string, paragraphId?: number) => void;
  
  handleParagraphSelection: (paragraphId: number) => void;
  handleEditClick: (paragraphId: number) => void;
  handleRegenerateClick: (paragraphId: number) => void;
  handleParagraphTextUpdate: (paragraphId: number, newText: string) => void;
  handleParagraphDelete: (paragraphId: number) => void;
  handleParagraphMove: (paragraphId: number, direction: 'up' | 'down') => void;
  handleParagraphReorder: (data: string[] | StreamingTextArray) => void;
}

export const useDocumentEditorStore = create<DocumentEditorState & DocumentEditorActions>()(
  devtools(
    immer((set, get) => ({
    // Initial state
    streamingTextArray: [],
    isStreamingComplete: false,
    selectedParagraphId: null,
    saveResult: { url: "", message: "" },
    generatedDocuments: [],
    editMode: false,
    regenerateMode: false,
    
    // Basic state setters
    setStreamingTextArray: (textArray) => {
      set(state => {
        state.streamingTextArray = textArray;
      });
    },
    
    setIsStreamingComplete: (isComplete) => {
      set(state => {
        state.isStreamingComplete = isComplete;
      });
    },
    
    setSelectedParagraphId: (id) => {
      set(state => {
        state.selectedParagraphId = id;
      });
    },
    
    setSaveResult: (result) => {
      set(state => {
        state.saveResult = result;
      });
    },
    
    setGeneratedDocuments: (documents) => {
      set(state => {
        state.generatedDocuments = documents;
      });
    },
    
    setEditMode: (isEditing) => {
      set(state => {
        state.editMode = isEditing;
      });
    },
    
    setRegenerateMode: (isRegenerating) => {
      set(state => {
        state.regenerateMode = isRegenerating;
      });
    },
    
    // Complex actions
    resetEditor: () => {
      set(state => {
        state.streamingTextArray = [];
        state.isStreamingComplete = false;
        state.selectedParagraphId = null;
        state.editMode = false;
        state.regenerateMode = false;
      });
    },
    
    completeEditing: () => {
      set(state => {
        state.isStreamingComplete = true;
      });
    },
    
    updateContent: (content, paragraphId) => {
      if (paragraphId !== undefined) {
        // Update specific paragraph
        set(state => {
          state.streamingTextArray = state.streamingTextArray.map(p => 
            p.id === paragraphId ? { ...p, text: content } : p
          );
        });
      } else {
        // Update entire document
        set(state => {
          const paragraphs = content
            .split(/\n\s*\n+/)
            .map((txt, idx) => ({ id: idx, text: txt.trim() }));
          state.streamingTextArray = paragraphs;
        });
      }
    },
    
    handleParagraphSelection: (paragraphId) => {
      set(state => {
        state.selectedParagraphId = paragraphId;
      });
    },
    
    handleEditClick: (paragraphId) => {
      set(state => {
        state.selectedParagraphId = paragraphId;
        state.regenerateMode = false;
        state.editMode = true;
      });
    },
    
    handleRegenerateClick: (paragraphId) => {
      set(state => {
        state.selectedParagraphId = paragraphId;
        state.editMode = false;
        state.regenerateMode = true;
      });
    },
    
    handleParagraphTextUpdate: (paragraphId, newText) => {
      set(state => {
        state.streamingTextArray = state.streamingTextArray.map(p => 
          p.id === paragraphId ? { ...p, text: newText } : p
        );
        state.editMode = false;
      });
    },
    
    handleParagraphDelete: (paragraphId) => {
      set(state => {
        state.streamingTextArray = state.streamingTextArray.filter(p => p.id !== paragraphId);
        if (state.selectedParagraphId === paragraphId) {
          state.selectedParagraphId = null;
        }
      });
    },
    
    handleParagraphMove: (paragraphId, direction) => {
      set(state => {
        const index = state.streamingTextArray.findIndex(p => p.id === paragraphId);
        if (index === -1) return;
        
        const newIndex = direction === 'up' 
          ? Math.max(0, index - 1) 
          : Math.min(state.streamingTextArray.length - 1, index + 1);
          
        if (newIndex === index) return;
        
        const result = [...state.streamingTextArray];
        const [movedItem] = result.splice(index, 1);
        result.splice(newIndex, 0, movedItem);
        state.streamingTextArray = result;
      });
    },
    
    handleParagraphReorder: (data) => {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        set(state => {
          state.streamingTextArray = data as StreamingTextArray;
        });
      }
    },
  })),
  { name: 'document-editor-store' }
  )
);