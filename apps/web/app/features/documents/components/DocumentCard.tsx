// File path: apps/web/app/features/documents/components/DocumentCard.tsx
'use client'
import React, { useRef, useState } from 'react';
import { deleteDocument, getDocumentSignedURL } from '@/app/features/documents/actions/fileActions';
import { DocumentRecord } from '@fedjobs/database';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrashAlt, 
  faChevronDown, 
  faChevronUp, 
  faSpinner, 
  faCheckCircle, 
  faExclamationCircle,
  faFileAlt,
  faFileWord,
  faFilePdf,
  faFileExcel,
  faExternalLinkAlt,
  faDownload
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { truncateDescription } from '@/app/shared/utils/textUtils';
import { ParseResponse } from '@/app/features/documents/types/ParseResponse';
import usePageVisibility from '@/app/shared/hooks/usePageVisibility';
import { AnalysisStatus } from '@/app/features/documents/types/AnalysisStatus';
import { useDocumentPolling } from '@/app/features/documents/hooks/useDocumentPolling';
import { Button } from '@/app/shared/components/ui/Button';
import Badge, { BadgeVariant } from '@/app/shared/components/ui/Badge';


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

  // Function to get file icon based on document type or name
  const getFileIcon = () => {
    const fileName = document.name.toLowerCase();
    if (fileName.endsWith('.pdf')) return faFilePdf;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return faFileWord;
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return faFileExcel;
    return faFileAlt;
  };
  
  // Function to get status badge variant
  const getStatusBadgeVariant = (): BadgeVariant => {
    if (analysisStatus.isComplete) return 'success';
    if (analysisStatus.isError) return 'danger';
    if (analysisStatus.isAnalyzing) return 'warning';
    return 'default';
  };
  
  // Function to get status text
  const getStatusText = () => {
    if (analysisStatus.isComplete) return 'Analyzed';
    if (analysisStatus.isError) return 'Error';
    if (analysisStatus.isAnalyzing) return 'Analyzing';
    return 'Pending';
  };
  
  // Get icon for status badge
  const getStatusIcon = () => {
    if (analysisStatus.isComplete) return <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />;
    if (analysisStatus.isError) return <FontAwesomeIcon icon={faExclamationCircle} className="mr-1" />;
    if (analysisStatus.isAnalyzing) return <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />;
    return null;
  };

  return (
    <div className="p-4 border border-gray-200 rounded-md bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={getFileIcon()} className="text-gray-400 mr-2" />
            <h3 className="font-medium text-lg">{document.name}</h3>
            
            {selectionMode && (
              <input
                type="checkbox"
                className="ml-2 form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:border-blue-500 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
                checked={isSelected}
                onChange={() => onSelect(document.id)}
              />
            )}
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge 
              variant="primary" 
              size="sm" 
              rounded 
              className="uppercase font-semibold tracking-wide"
            >
              {document.type}
            </Badge>
            
            <Badge 
              variant={getStatusBadgeVariant()} 
              size="sm" 
              rounded 
              icon={getStatusIcon()}
            >
              {getStatusText()}
            </Badge>
            
            {document.createdAt && (
              <Badge 
                variant="default" 
                size="sm" 
                rounded
              >
                {new Date(document.createdAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
          
          {/* Progress indicator during analysis */}
          {analysisStatus.isAnalyzing && (
            <div className="mt-2 w-full max-w-md">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${analysisStatus.progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center">
                <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
                Analyzing... {analysisStatus.progress.toString()}% Complete
              </div>
            </div>
          )}
          
          {/* Description section */}
          {document.description && (
            <div className="mt-3 text-sm text-gray-600">
              <p>
                {isExpanded ? document.description : truncateDescription(document.description, maxDescriptionLength)}
              </p>
              {isTruncated && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-blue-500 hover:text-blue-700 text-xs flex items-center"
                >
                  <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="mr-1" />
                  {isExpanded ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Actions section */}
        <div className="flex flex-col gap-2">
          {document.type === "resume" && isParsed && (
            <Link 
              href={`/resume/${document.id}`}
              className="inline-flex items-center justify-center font-medium rounded focus:outline-none focus:ring-2 transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-300 py-1 px-2 text-sm"
            >
              <span>Open Resume</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1 h-3 w-3" />
            </Link>
          )}
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => handleViewClick(document.id)}
            leftIcon={<FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />}
          >
            View Document
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            className="text-red-500 hover:bg-red-50"
            onClick={() => handleDeleteClick(document.id)}
          >
            <FontAwesomeIcon icon={faTrashAlt} className="mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;

