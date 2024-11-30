// hooks/useDocumentPolling.ts
import { useEffect, useRef } from 'react';
import { ParseResponse } from '../_types/ParseResponse';
import { getParsingStatus } from '../_actions/parsings/parsingStatusActions';

interface PollingHookProps {
    documentId: number;
    pollingUrl: string;
    pollingInterval: number;
    isPageVisible: boolean;
    shouldPoll: boolean;
    onPollingUpdate: (response: ParseResponse) => void;
  }
  

export const useDocumentPolling = ({
  documentId,
  pollingUrl,
  pollingInterval,
  isPageVisible,
  shouldPoll,
  onPollingUpdate,
}: PollingHookProps) => {
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const pollingCallback = async () => {
      try {

        const response: ParseResponse= await getParsingStatus(documentId);
    
        // Call onPollingUpdate with the fetched ParseResponse
        onPollingUpdate(response);
      } catch (error) {
        console.error('Polling failed:', error);
        // Call onPollingUpdate with an error status if the fetch fails
        onPollingUpdate({
          status: 'error',
          percent: 0,
          message: 'Polling failed due to an error.'
        });
      }
    };

    if (isPageVisible && shouldPoll) {
      timerIdRef.current = setInterval(pollingCallback, pollingInterval);
    } else {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    }

    return () => {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
    };
  }, [documentId, pollingUrl, pollingInterval, isPageVisible, shouldPoll, onPollingUpdate]);
};
