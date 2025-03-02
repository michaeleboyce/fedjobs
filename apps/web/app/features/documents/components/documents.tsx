// File path: apps/web/app/features/documents/components/documents.tsx
'use client';
import React, { useState } from "react";
import {
  DocumentRecord
} from "@fedjobs/database";
import DocumentCard from "./DocumentCard";
import { useRouter } from "next/navigation";
import { Button } from '@/app/shared/components/ui/Button';

type DocumentsProps = { 
  documents: DocumentRecord[];
  removeDocument: (documentId: number) => void;
}

export const Documents: React.FC<DocumentsProps> = ({ documents, removeDocument } ) => {
  //Authentication already happened at the server component level above this component
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);

  const router = useRouter();

  const handleGenerateClick = () => {
    setSelectionMode(true);
  };

  const handleSelectDocument = (id: number) => {
    setSelectedDocumentId(selectedDocumentId === id ? null : id);
  };

  const handleSelectResumeClick = () => {
    if (selectedDocumentId) {
      router.push(`/generate/resume/${selectedDocumentId}`);
    }
  };

  const handleCancel = () => {
    setSelectionMode(false);
    setSelectedDocumentId(null);
  };

  

  const filteredDocuments = documentTypeFilter === "all"
    ? documents
    : documents.filter(doc => doc.type === documentTypeFilter);

  const documentTypes = ["all", "resume", "cover_letter", "ecq", "tcq", "other"];

  return (
    <div>
      <div className="filter-container">
        <select
          value={documentTypeFilter}
          onChange={(e) => setDocumentTypeFilter(e.target.value)}
          className="filter-dropdown"
        >
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>
        <button
          onClick={() => setDocumentTypeFilter("all")}
          className="clear-filter-button"
        >
          Clear Filter
        </button>
      </div>
      <div className="flex justify-end space-x-2">
        {selectionMode ? (
            <>
            <Button 
                variant="primary"
                disabled={!selectedDocumentId}
                onClick={handleSelectResumeClick}
                className={selectedDocumentId ? '' : 'opacity-50 cursor-not-allowed'}
            >
                Generate with Selected Resume
            </Button>
            <Button 
                variant="secondary"
                onClick={() => {}} 
            >
                Generate without Selecting
            </Button>
            <Button 
                variant="danger"
                onClick={handleCancel} 
            >
                Cancel
            </Button>
            </>
        ) : (
            <Button 
              variant="primary"
              onClick={handleGenerateClick} 
            >
              Generate Document
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {filteredDocuments.map((document, index) => (
          <DocumentCard
            key={index}
            document={document}
            selectionMode={selectionMode}
            onSelect={handleSelectDocument}
            isSelected={selectedDocumentId === document.id}
            removeDocument={removeDocument}
          />
        ))}
      </div>
    </div>
  );
};