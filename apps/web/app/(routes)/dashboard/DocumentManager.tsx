'use client'
import FileUploadBox from "@/app/(routes)/dashboard/_Components/FileUploadBox";
import React, { useState, useCallback } from "react";
import { Document } from '@/app/_db/schema/documents';
import { Documents } from "./documents";
import { ProcessDocumentResponse } from "@/app/_types/FunctionReturns";
import { QueryClient, QueryClientProvider } from 'react-query';
const queryClient = new QueryClient();

type DocumentsProps = {
    userId: string;
    initialDocuments: Document[]
    processDocumentFromFormData: (formData: FormData) => Promise<ProcessDocumentResponse>;
  };

export const DocumentManager: React.FC<DocumentsProps> = ({userId, initialDocuments, processDocumentFromFormData}) => {

  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const addDocument = useCallback((newDocument: Document) => {
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