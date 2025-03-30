// File path: apps/web/app/features/documents/components/DocumentManager.tsx
'use client';
import FileUploadBox from "./FileUploadBox";
import React, { useEffect } from "react";
import { DocumentRecord } from '@fedjobs/database';
import { Documents } from "./documents";
import { ProcessDocumentResponse } from "@/app/features/documents/types/FunctionReturns";
import { QueryClient, QueryClientProvider } from 'react-query';
import { useDocumentsManagement } from "../hooks/useDocumentsManagement";

const queryClient = new QueryClient();

type DocumentsProps = {
    userId: string;
    initialDocuments: DocumentRecord[]
    processDocumentFromFormData: (formData: FormData) => Promise<ProcessDocumentResponse>;
};

export const DocumentManager: React.FC<DocumentsProps> = ({
  userId,
  initialDocuments,
  processDocumentFromFormData
}) => {
  // Get documents state and actions from the store
  const {
    documents: storeDocuments,
    handleUploadDocument,
    handleRemoveDocument,
    refetchDocuments
  } = useDocumentsManagement();
  
  // Initialize store with server documents if empty
  useEffect(() => {
    // If the store is empty but we have initial documents, sync them
    if (storeDocuments.length === 0 && initialDocuments.length > 0) {
      // In a real implementation, we would have a syncDocuments action in the store
      // For now we'll just refetch to ensure latest data
      refetchDocuments();
    }
  }, [initialDocuments, storeDocuments.length, refetchDocuments]);

  // Document to use - prefer store documents, fall back to initial documents
  // Make sure we have consistent types by adding missing fields if needed
  const documentsToDisplay = storeDocuments.length > 0 
    ? storeDocuments 
    : initialDocuments.map(doc => ({
        ...doc,
        data: doc.data || {},
        content: doc.content || '',
        source: doc.source || 'USER_UPLOADED'
      }));
  
  // Pass documents and actions to children
  return (
    <div className="space-y-8">
      <QueryClientProvider client={queryClient}>
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">Upload Documents</h2>
          <FileUploadBox 
            addDocument={(doc) => {
              // This will be replaced with proper store integration
              // Currently FileUploadBox expects this function
              refetchDocuments();
            }} 
            processDocumentFromFormData={processDocumentFromFormData}
          />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">Your Documents</h2>
          <Documents 
            documents={documentsToDisplay} 
            removeDocument={handleRemoveDocument} 
          />
        </div>
      </QueryClientProvider>
    </div>
  );
}

export default DocumentManager;
