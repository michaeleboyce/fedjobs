// File path: apps/web/app/features/documents/components/DocumentManager.tsx
'use client';
import FileUploadBox from "./FileUploadBox";
import React, { useState, useCallback } from "react";
import { DocumentRecord } from '@fedjobs/database';
import { Documents } from "./documents";
import { ProcessDocumentResponse } from "@/app/features/documents/types/FunctionReturns";
import { QueryClient, QueryClientProvider } from 'react-query';
import Link from 'next/link'; // Import Link

const queryClient = new QueryClient();

type DocumentsProps = {
    userId: string;
    initialDocuments: DocumentRecord[]
    processDocumentFromFormData: (formData: FormData) => Promise<ProcessDocumentResponse>;
  };

export const DocumentManager: React.FC<DocumentsProps> = ({userId, initialDocuments, processDocumentFromFormData}) => {

  const [documents, setDocuments] = useState<DocumentRecord[]>(initialDocuments);

  const addDocument = useCallback((newDocument: DocumentRecord) => {
    setDocuments((prevDocuments) => [...prevDocuments, newDocument]);
  }, []);

  const removeDocument = useCallback((documentId: number) => {
    setDocuments((prevDocuments) => prevDocuments.filter(doc => doc.id !== documentId));
  }, []);


  // Pass addDocument and documents to FileUploadBox and Documents components
  return (
    <div>
      <QueryClientProvider client={queryClient}>
        <FileUploadBox addDocument={addDocument} processDocumentFromFormData={processDocumentFromFormData}/>
        <Documents documents={documents} removeDocument={removeDocument} />
      </QueryClientProvider>
    </div>
  );
}

export default DocumentManager;
