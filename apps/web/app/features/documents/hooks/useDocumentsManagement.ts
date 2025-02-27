'use client';

import { useEffect } from 'react';
import { useDocumentsStore } from '@/app/store';
import { DocumentType } from '@fedjobs/types';

export function useDocumentsManagement() {
  const {
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    selectedDocument,
    fetchDocuments,
    uploadDocument,
    getDocumentURL,
    removeDocument,
    setSelectedDocument,
    resetUploadState,
  } = useDocumentsStore();

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle document upload
  const handleUploadDocument = async (
    file: File,
    addToKnowledgeBank: boolean = false,
    documentType: DocumentType = 'resume',
    description: string = '',
    content: string = ''
  ) => {
    await uploadDocument(file, addToKnowledgeBank, documentType, description, content);
  };

  // Handle document selection
  const selectDocument = (documentId: number) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      setSelectedDocument(document);
    }
  };

  // Handle document removal
  const handleRemoveDocument = async (documentId: number) => {
    await removeDocument(documentId);
  };

  // Get a signed URL for a document
  const getSignedURL = async (documentId: number) => {
    return await getDocumentURL(documentId);
  };

  // Reset the upload state
  const clearUploadState = () => {
    resetUploadState();
  };

  // Filter documents by type
  const getDocumentsByType = (type: DocumentType) => {
    return documents.filter(doc => doc.type === type);
  };

  return {
    // State
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    selectedDocument,
    
    // Actions
    handleUploadDocument,
    selectDocument,
    handleRemoveDocument,
    getSignedURL,
    clearUploadState,
    
    // Helper functions
    getDocumentsByType,
    
    // Fetch/refresh data
    refetchDocuments: fetchDocuments,
  };
}