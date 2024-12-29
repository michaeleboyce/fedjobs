// /apps/web/app/(routes)/api/ai/generate/(utils)/interfaces.ts

export interface AIProviderStream {
    /**
     * Starts the streaming process.
     * @param onToken Callback invoked with each token received.
     */
    startStreaming(onToken: (token: string) => void): Promise<void>;
  
    /**
     * Cleans up any resources or listeners after streaming is complete.
     */
    cleanup(): void;
  }
  