'use client'
import React, { useRef, useState } from 'react';
import { deleteDocument, getDocumentSignedURL, getUpdatedDocumentStatus } from '../../../_actions/files/fileActions';
import { Document } from '@/app/_db/schema/documents';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faChevronDown, faChevronUp, faSpinner, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { getParsingsByDocId, updateDocWithResumeJSON } from '@/app/_actions/dbActions';
import { truncateDescription } from '../../../_utils/textUtils';
import { ParseResponse } from '@/app/_types/ParseResponse';
import { useQuery } from 'react-query';
import usePageVisibility from '@/app/_hooks/usePageVisibility';
import { AnalysisStatus } from '@/app/_types/AnalysisStatus';
import { useDocumentPolling } from '@/app/_hooks/useDocumentPolling';



interface DocumentCardProps  {
  document: Document;
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
  removeDocument
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

  console.log(`Rendered document card for document: ${document.id}`);

  const handleViewClick = async (documentId: number) => {
    // Call getDocumentSignedURL and handle the result
      const response = await getDocumentSignedURL(documentId);
      if (response.success) {
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

//#region Comments
  // const getParseStatus = async (documentId: number): Promise<ParseResponse> => {
  //   // Extracting documentId from queryKey
  //   // Assuming the documentId is the second item in the queryKey array
    
  //   const response = await fetch(`${appUrl}/api/parse/`, {
  //     method: 'GET',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ documentId }),
  //   });
  //   const data = await response.json();
  //   return data;
  // };
  // const { data, isLoading: isPolling } = useQuery({
  //   queryKey: ['parseStatus', document.id, document.name, analysisStatus.progress], 
  //   queryFn: async () => getParseStatus(document.id),
  //   enabled: document.isParsed === false && document.type === 'resume',

  //   refetchInterval: (data: ParseResponse|undefined) => (data?.status === 'pending' ? 5000 : false), // Poll every 5 seconds if status is 'pending'
  //   onSuccess: (data) => {
  //     if (data.status === 'complete'){
  //       setAnalysisStatus({
  //         isAnalyzing: false,
  //         isError: false,
  //         isComplete: true,
  //         progress: 100,
  //       })
  //     } else if (data.status === 'pending'){
  //       setAnalysisStatus(prevStatus => ({
  //         ...prevStatus,
  //         progress: data.percent,
  //       }));
  //     }
  //   },
  //   onError: (error) => {
  //     console.error('Error during document analysis:', error);
  //     setAnalysisStatus({
  //       isAnalyzing: false,
  //       isError: true,
  //       isComplete: false,
  //       progress: 0,
  //     });
  //   }
  // });
  

  // useEffect(() => {
  //   const initiateParsingProcess = async () => {
  //     if (!document.isParsed && document.type === 'resume') {
  //       if ((await getParsingsByDocId(document.id)).length > 0)
  //         return;
  //       try {
  //         // Start the parsing process
  //         const startResponse = await fetch(`${appUrl}/api/ai/parse`, {
  //           method: 'POST',
  //           headers: { 'Content-Type': 'application/json' },
  //           body: JSON.stringify(document),
  //         });

  //         // Assume startResponse includes an ID or some identifier for the parsing process
  //         const startResult = await startResponse.json();
  //         if (startResult.status !== 'ok') {
  //           throw new Error(startResult.message || 'Failed to start parsing');
  //         }

  //         // Function to poll for status
  //         const pollForCompletion = async () => {
  //           let isComplete = false;
  //           while (!isComplete) {
  //             const pollResponse = await fetch(`${appUrl}/api/parse/status`, { // Adjust this endpoint as needed
  //               method: 'POST',
  //               headers: { 'Content-Type': 'application/json' },
  //               body: JSON.stringify({ documentId: document.id }), // Adjust payload as necessary
  //             });
  //             const pollResult = await pollResponse.json();

  //             switch (pollResult.status) {
  //               case 'complete':
  //                 isComplete = true;
  //                 setAnalysisStatus({
  //                   isAnalyzing: false,
  //                   isError: false,
  //                   isComplete: true,
  //                   progress: 100,
  //                 });
  //                 break;
  //               case 'pending':
  //                 setAnalysisStatus(prevStatus => ({
  //                   ...prevStatus,
  //                   progress: pollResult.percent,
  //                 }));
  //                 await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
  //                 break;
  //               case 'error':
  //                 throw new Error(pollResult.message);
  //             }
  //           }
  //         };

  //         pollForCompletion();

  //       } catch (error) {
  //         console.error('Error during document analysis:', error);
  //         setAnalysisStatus({
  //           isAnalyzing: false,
  //           isError: true,
  //           isComplete: false,
  //           progress: 0,
  //         });
  //       }
  //     }
  //   };

  //   initiateParsingProcess();
  // }, [document.id, document.isParsed, document.type]);

  //#endregion
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
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs">
              <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} /> 
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-4">
        {document.type === "resume" && document.isParsed && 
        <Link href={`/resume/${document.id}`} className="btn btn-primary">
          Open Resume
        </Link>}
        <button onClick={() => handleViewClick(document.id)} className="btn btn-primary">
            View Doc
        </button>
        <button onClick={() => handleDeleteClick(document.id)} className="btn btn-delete">
            <FontAwesomeIcon icon={faTrashAlt} /> Delete
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;

