// File path: apps/web/app/(routes)/api/ai/generate/(utils)/OpenAIStream.ts
import { AIProviderStream } from "./interfaces";
import OpenAI from "openai";

// Based on official docs, each chunk looks like:
export interface ChatCompletionChunk {
  id: string;                           // "chatcmpl-123"
  object: string;                       // "chat.completion.chunk"
  created: number;                      // e.g., 1694268190
  model: string;                        // "gpt-4o-mini" or "gpt-3.5-turbo"
  service_tier?: string | null;         // optional
  system_fingerprint?: string;          // optional
  usage?: unknown;                      // optional, only in final chunk if stream_options.include_usage

  // The important part for streaming
  choices: Array<{
    index: number;
    delta: {
      role?: string;     // "assistant" (usually appears once at the beginning)
      content?: string;  // partial or full content chunk
    };
    logprobs: any;       // null or some object
    finish_reason: string | null; // "stop", etc.
  }>;
}

interface OpenAIStreamOptions {
  model: string;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number; // <-- add this line
}


export class OpenAIStream implements AIProviderStream {
  private client: OpenAI;
  private options: OpenAIStreamOptions;
  private abortController: AbortController;

  constructor(options: OpenAIStreamOptions) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY_35 ?? "",
    });
    this.options = options;
    this.abortController = new AbortController();
  }

  // Our new cleanup() method
  cleanup(): void {
    this.abortController.abort();
  }
  
  async startStreaming(onToken: (token: string) => void): Promise<void> {
    try {
      // Build the request body
      const requestBody: any = {
        model: this.options.model,
        // If you plan to omit temperature for certain models,
        // only add it if it's defined
        ...(typeof this.options.temperature === "number" && {
          temperature: this.options.temperature,
        }),
        messages: [
          {
            role: "user",
            content: this.options.prompt,
          },
        ],
        stream: true,
        store: true,
      };
  
      // If it's a GPT-based model
      if (typeof this.options.max_tokens === "number") {
        requestBody.max_tokens = this.options.max_tokens;
      }
  
      // If it's an o1-based model
      if (typeof this.options.max_completion_tokens === "number") {
        requestBody.max_completion_tokens = this.options.max_completion_tokens;
      }
  
      // Now call the API
      const response = await this.client.chat.completions.create(
        requestBody,
        {
          signal: this.abortController.signal,
        }
      );
  
      return new Promise<void>(async (resolve, reject) => {
        try {
          // If we know response is actually an async iterable:
          for await (const chunk of (response as unknown as AsyncIterable<any>)) {
            const content = chunk?.choices?.[0]?.delta?.content;
            if (content) {
              onToken(content);
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    } catch (error) {
      throw error;
    }
  }
}