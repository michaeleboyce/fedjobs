// File path: apps/web/app/store/documentsStore.ts
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { toast } from 'react-toastify';
import { DocumentType } from '@fedjobs/types';
import { 
  processFile, 
  getDocumentSignedURL, 
  deleteDocument 
} from '../features/documents/actions/fileActions';

// Define types for document state
interface Document {
  id: number;
  name: string;
  url: string;
  type: DocumentType;
  createdAt: Date;
  isParsed: boolean;
  userId: string;
  inKnowledgeBank: boolean;
  description: string;
  s3Key: string;
  // Adding required properties from DocumentRecord
  data: unknown;
  content: string;
  source: "USER_UPLOADED" | "APPLICATION_GENERATED";
}

interface DocumentsState {
  documents: Document[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  selectedDocument: Document | null;
}

interface DocumentsActions {
  // Document CRUD operations
  fetchDocuments: () => Promise<void>;
  uploadDocument: (
    file: File, 
    addToKnowledgeBank: boolean, 
    documentType?: DocumentType,
    description?: string,
    content?: string
  ) => Promise<void>;
  getDocumentURL: (documentId: number) => Promise<string | null>;
  removeDocument: (documentId: number) => Promise<void>;
  
  // UI state management
  setSelectedDocument: (document: Document | null) => void;
  resetUploadState: () => void;
}

export const useDocumentsStore = create<DocumentsState & DocumentsActions>()(
  devtools(
    immer((set, get) => ({
    // Initial state
    documents: [],
    isLoading: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    selectedDocument: null,
    
    // Actions
    fetchDocuments: async () => {
      set(state => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        // Add API call to fetch documents here
        // For now, we'll leave this as a placeholder
        
        // Mock implementation:
        // const response = await fetch('/api/documents');
        // const data = await response.json();
        // if (response.ok) {
        //   set(state => { state.documents = data; });
        // } else {
        //   throw new Error(data.message);
        // }
        
        // After fetching, update loading state
        set(state => {
          state.isLoading = false;
        });
      } catch (error: any) {
        set(state => {
          state.error = error.message || 'Failed to fetch documents';
          state.isLoading = false;
        });
        toast.error('Failed to fetch documents');
      }
    },
    
    uploadDocument: async (
      file: File, 
      addToKnowledgeBank: boolean, 
      documentType: DocumentType = 'resume',
      description: string = '',
      content: string = ''
    ) => {
      set(state => {
        state.isUploading = true;
        state.uploadProgress = 0;
        state.error = null;
      });
      
      try {
        // Create form data for upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          set(state => {
            if (state.uploadProgress < 90) {
              state.uploadProgress += 10;
            }
          });
        }, 500);
        
        // Process the file
        const result = await processFile(
          formData,
          addToKnowledgeBank,
          documentType,
          description,
          content
        );
        
        clearInterval(progressInterval);
        
        if ('success' in result) {
          // Add the new document to the state
          set(state => {
            state.uploadProgress = 100;
            // Ensure document has all required fields
            const document = {
              ...result.success.document,
              data: result.success.document.data || {},
              content: result.success.document.content || '',
              source: result.success.document.source || 'USER_UPLOADED'
            };
            state.documents.push(document);
          });
          
          toast.success('Document uploaded successfully');
          
          // Reset upload state after a delay
          setTimeout(() => {
            set(state => {
              state.isUploading = false;
              state.uploadProgress = 0;
            });
          }, 1000);
        } else {
          throw new Error(result.failure);
        }
      } catch (error: any) {
        set(state => {
          state.error = error.message || 'Failed to upload document';
          state.isUploading = false;
          state.uploadProgress = 0;
        });
        toast.error(error.message || 'Failed to upload document');
      }
    },
    
    getDocumentURL: async (documentId: number) => {
      try {
        const response = await getDocumentSignedURL(documentId);
        
        if ('success' in response) {
          return response.success.url;
        } else {
          toast.error(response.failure || 'Failed to get document URL');
          return null;
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to get document URL');
        return null;
      }
    },
    
    removeDocument: async (documentId: number) => {
      set(state => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        const response = await deleteDocument(documentId);
        
        if ('success' in response) {
          set(state => {
            state.documents = state.documents.filter(doc => doc.id !== documentId);
            if (state.selectedDocument?.id === documentId) {
              state.selectedDocument = null;
            }
          });
          toast.success('Document deleted successfully');
        } else {
          throw new Error(response.failure);
        }
      } catch (error: any) {
        set(state => {
          state.error = error.message || 'Failed to delete document';
        });
        toast.error(error.message || 'Failed to delete document');
      } finally {
        set(state => {
          state.isLoading = false;
        });
      }
    },
    
    setSelectedDocument: (document: Document | null) => {
      set(state => {
        state.selectedDocument = document;
      });
    },
    
    resetUploadState: () => {
      set(state => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = null;
      });
    },
  })),
  { name: 'documents-store' }
  )
);