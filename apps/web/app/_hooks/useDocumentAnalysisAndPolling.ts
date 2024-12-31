// File path: apps/web/app/_hooks/useDocumentAnalysisAndPolling.ts
// import { useMutation, useQuery, QueryFunctionContext } from 'react-query';
// import { Document } from '../_db/schema/documents';
// import { ParseResponse } from '../(routes)/api/ai/parse/route';

// type UseDocumentAnalysisAndPollingParams = {
//     document: Document;
//     appUrl: string;
//     onSuccess: (data: ParseResponse) => void;
//     onError: () => void;
// };

// const useDocumentAnalysisAndPolling = ({ document, appUrl, onSuccess, onError }: UseDocumentAnalysisAndPollingParams) => {
//   const startParsing = async (doc: Document): Promise<ParseResponse> => {
//     const response = await fetch(`${appUrl}/api/ai/parse`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(doc),
//     });
//     return response.json();
//   };

//   const getParseStatus = async (context: QueryFunctionContext): Promise<ParseResponse> => {
//     // Extracting documentId from queryKey
//     // Assuming the documentId is the second item in the queryKey array
//     const documentId = context.queryKey[1] as number; // Adjust according to actual queryKey structure

//     const response = await fetch(`${appUrl}/api/parse/status`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ documentId }),
//     });
//     return response.json();
//   };

//   const { mutate, isLoading: isParsing } = useMutation(['startParsing', document], () => startParsing(document), {
//     onSuccess: (data: ParseResponse) => {
//       if (data.status === 'ok') {
//         refetch();
//       } else {
//         onError();
//       }
//     },
//     onError: () => onError(),
//   });

//   const { data, isLoading: isPolling, refetch } = useQuery<ParseResponse, Error>(['parseStatus', document.id], getParseStatus, {
//     enabled: false, // This query should not run automatically
//     onSuccess: (data: ParseResponse) => {
//       if (data.status === 'complete') {
//         onSuccess(data);
//       }
//     },
//     onError: () => onError(),
//     refetchInterval: (data: ParseResponse|undefined) => (data?.status === 'pending' ? 5000 : false), // Poll every 5 seconds if status is 'pending'
//   });

//   const startAnalysis = () => mutate();

//   return { startAnalysis, data, isParsing, isPolling };
// };

// export { useDocumentAnalysisAndPolling };