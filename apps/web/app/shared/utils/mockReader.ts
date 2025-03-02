// File path: apps/web/app/shared/utils/mockReader.ts
export function createMockReader(text: string, chunkSizeRange: [number, number], paragraphId?: number) {
  let currentPosition = 0;
  return {
    read: () => {
      return new Promise<{ done: boolean; value?: Uint8Array }>((resolve) => {
        setTimeout(() => {
          if (currentPosition >= text.length) {
            resolve({ done: true });
          } else {
            const chunkSize = Math.floor(Math.random() * (chunkSizeRange[1] - chunkSizeRange[0] + 1)) + chunkSizeRange[0];
            const chunk = text.substring(currentPosition, Math.min(currentPosition + chunkSize, text.length));
            currentPosition += chunkSize;

            // Convert the string chunk to Uint8Array
            const encoder = new TextEncoder();
            const encodedChunk = encoder.encode(chunk);

            resolve({ done: false, value: encodedChunk });
          }
        }, Math.random() * 75); // Simulate network delay
      });
    }
  };
}
