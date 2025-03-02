import { StreamingTextArray } from '../types';
import { createMockReader } from '@/app/shared/utils/mockReader';
import { GenerationSelection } from '../types';

// API url based on environment
// TODO: Refactor this to be a generic function that is called in some manner
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://fedjobs.vercel.app';

/**
 * Creates an API adapter for content generation
 */
export function createAPI(
  isDummy: boolean,
  docType: string,
  paragraphId: number | undefined,
  generationSelection: GenerationSelection,
  streamingTextArray: StreamingTextArray,
  model: string,
  dummyText: string = '',
  paragraphDummyText: string = ''
) {
  return {
    /**
     * Generates content using either mock data or actual API
     */
    async generateContent(
      paragraphId: number | undefined,
      regenerationText: string | undefined,
      updateCallback: (text: string, paragraphId?: number) => void
    ) {
      // Create a ReadableStreamDefaultReader to read the stream
      let reader: ReadableStreamDefaultReader<Uint8Array>;
      
      if (isDummy) {
        // Use mock reader for testing
        reader = createMockReader(
          paragraphId !== undefined ? paragraphDummyText : dummyText, 
          [5, 15]
        ) as ReadableStreamDefaultReader<Uint8Array>;
      } else {
        // Make API request
        const res = await fetch(`${API_BASE_URL}/api/ai/generate/${docType}${
          paragraphId !== undefined ? `/paragraph` : ``
        }`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            generationSelection,
            streamingTextArray,
            paragraphId,
            regenerationText: regenerationText ?? '',
            model,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error("Error from AI route. Possibly invalid response.");
        }
        reader = res.body.getReader();
      }
      
      // Process stream chunks
      let combinedOutput = "";
      let iterationCount = 0;
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          updateCallback(combinedOutput, paragraphId);
          break;
        }
        
        combinedOutput += decoder.decode(value, { stream: true });
        iterationCount++;
        
        if (iterationCount % 5 === 0) {
          updateCallback(combinedOutput, paragraphId);
        }
      }
    }
  };
}