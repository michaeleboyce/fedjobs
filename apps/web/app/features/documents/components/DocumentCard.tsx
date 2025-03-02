// File path: apps/web/app/features/documents/components/DocumentCard.tsx
'use client'
import React, { useRef, useState } from 'react';
import { deleteDocument, getDocumentSignedURL, } from '../actions/fileActions';
import { DocumentRecord } from '@fedjobs/database';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faChevronDown, faChevronUp, faSpinner, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { truncateDescription } from '../../../shared/utils/textUtils';
import { ParseResponse } from '@/app/features/documents/types/ParseResponse';
import usePageVisibility from '@/app/shared/hooks/usePageVisibility';
import { AnalysisStatus } from '@/app/features/documents/types/AnalysisStatus';
import { useDocumentPolling } from '@/app/features/documents/hooks/useDocumentPolling';
import { Button } from '@/app/shared/components/ui/Button';



interface DocumentCardProps  {
  document: DocumentRecord;
  selectionMode: boolean;
  onSelect: (id: number) => void;
  isSelected: boolean;
  removeDocument: (documentId: number ) => void;
};

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  selectionMode,
  onSelect,
  isSelected,
  removeDocument,
  
}) => {
  const [isExpanded, setIsExpanded] = useState(false);


  const maxDescriptionLength = 100; // Define a max length for the description
  const expectedAnnotationLength = document.content.length;
  const isTruncated = document.description && document.description.length > maxDescriptionLength;
  const appUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://fedjobs.vercel.app'

  const isPageVisible = usePageVisibility();
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const [isPollingEnabled, setIsPollingEnabled] = useState(true);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({
    isAnalyzing: !document.isParsed,
    isError: false,
    isComplete: document.isParsed,
    progress: 0,
  });
  const [isParsed, setIsParsed] = useState(document.isParsed);

  const handleViewClick = async (documentId: number) => {
    // Call getDocumentSignedURL and handle the result
      const response = await getDocumentSignedURL(documentId);
      if ("success" in response) {
          window.open(response.success.url, '_blank');
      } else {
          alert('Error retrieving document: ' + response.failure);
      }
    };
   
    const handleDeleteClick = async (documentId: number) => {
      // Confirm before deleting
      if (window.confirm('Are you sure you want to delete this document?')) {
          const response = await deleteDocument(documentId);
          if (response.success) {
              alert('Document deleted successfully');
              removeDocument(documentId);
          } else {
              alert('Error deleting document: ' + response.failure);
          }
      }
  };

  const handlePollingUpdate = (response: ParseResponse) => {
    // Now correctly processing a ParseResponse object
    setAnalysisStatus(prevStatus => {
      let newStatus = { ...prevStatus };

      switch (response.status) {
        case 'complete':
          newStatus = { isAnalyzing: false, isError: false, isComplete: true, progress: 100 };
          setIsParsed(true);
          break;
        case 'pending':
          newStatus = { ...prevStatus, isAnalyzing: true, isError: false, isComplete: false, progress: response.percent };
          break;
        case 'error':
          newStatus = { isAnalyzing: false, isError: true, isComplete: false, progress: 0 };
          break;
        // Optional: Handle 'ok' status if needed
      }

      return newStatus;
    });
  };
  
  useDocumentPolling({
    documentId: document.id,
    pollingUrl: `${appUrl}/api/ai/parse`,
    pollingInterval: 5000, // Adjust as necessary
    isPageVisible,
    shouldPoll: !document.isParsed && document.type === 'resume',
    onPollingUpdate: handlePollingUpdate,
  });

  return (
    <div className="card bg-white border border-gray-200 rounded-lg p-4 m-2 flex flex-col justify-between">
      {selectionMode && (
        <div className="absolute top-2 right-2">
          <input
            type="checkbox"
            className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:border-blue-500 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
            checked={isSelected}
            onChange={() => onSelect(document.id)}
          />
        </div>
      )}
      <div>
          <h5 className="card-title text-lg font-semibold">{document.name}</h5>
          <span className="badge bg-blue-200 text-blue-800 text-xs px-2 rounded-full uppercase font-semibold tracking-wide my-2">
              {document.type}
          </span>
      {analysisStatus.isAnalyzing && (
          <div className="flex items-center">
            <FontAwesomeIcon icon={faSpinner} spin />
            <span className="ml-2">Analyzing...{analysisStatus.progress.toString()}% Complete</span>
          </div>
        )}
        {analysisStatus.isError && (
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationCircle} />
            <span className="ml-2" title="Error analyzing this resume">Error</span>
          </div>
        )}
        {analysisStatus.isComplete && (
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCheckCircle} />
            <span className="ml-2">Analysis Complete</span>
          </div>
        )}
      </div>
      {document.description && (
        <div>
          <p>
            {isExpanded ? document.description : truncateDescription(document.description)}
          </p>
          {isTruncated && (
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              leftIcon={<FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-4">
        {document.type === "resume" && isParsed && 
        <Link 
          href={`/resume/${document.id}`}
          className="inline-flex items-center justify-center px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300"
        >
          Open Resume
        </Link>}
        <Button 
          variant="primary"
          onClick={() => handleViewClick(document.id)}
        >
          View Doc
        </Button>
        <Button 
          variant="danger"
          onClick={() => handleDeleteClick(document.id)}
          leftIcon={<FontAwesomeIcon icon={faTrashAlt} />}
        >
          Delete
        </Button>
      </div>
    </div>
  );
};

export default DocumentCard;

