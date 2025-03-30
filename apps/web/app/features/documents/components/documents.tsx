// File path: apps/web/app/features/documents/components/documents.tsx
'use client';
import React, { useState } from "react";
import { DocumentRecord } from "@fedjobs/database";
import DocumentCard from "./DocumentCard";
import { useRouter } from "next/navigation";
import { Button } from '@/app/shared/components/ui/Button';
import Select from '@/app/shared/components/ui/Select';

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter section */}
        <div className="flex items-center space-x-3">
          <Select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value)}
            options={documentTypes.map(type => ({
              value: type,
              label: type === "all" ? "All Documents" : type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")
            }))}
          />
          
          {documentTypeFilter !== "all" && (
            <button
              onClick={() => setDocumentTypeFilter("all")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Filter
            </button>
          )}
          
          <div className="text-sm text-gray-500">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-2">
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
                variant="outline"
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
      </div>

      {/* Document cards */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center rounded-md border border-gray-200">
            <p className="text-gray-500">No documents found matching the current filter.</p>
          </div>
        ) : (
          filteredDocuments.map((document, index) => (
            <DocumentCard
              key={document.id || index}
              document={document}
              selectionMode={selectionMode}
              onSelect={handleSelectDocument}
              isSelected={selectedDocumentId === document.id}
              removeDocument={removeDocument}
            />
          ))
        )}
      </div>
    </div>
  );
};