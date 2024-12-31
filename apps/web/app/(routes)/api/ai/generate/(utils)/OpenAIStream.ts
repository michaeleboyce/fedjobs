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
  temperature: number;
  max_tokens: number;
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

  async startStreaming(onToken: (token: string) => void): Promise<void> {
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.options.model,
          temperature: this.options.temperature,
          max_tokens: this.options.max_tokens,
          stream: true,
          messages: [
            {
              role: "user",
              content: this.options.prompt,
            },
          ],
        },
        {
          signal: this.abortController.signal,
        }
      );

      // response is an async iterable of chunk objects (ChatCompletionChunk)
      // We'll cast it as an AsyncIterable<ChatCompletionChunk>
      return new Promise<void>(async (resolve, reject) => {
        try {
          for await (const chunk of response as AsyncIterable<ChatCompletionChunk>) {
            // Each chunk might contain partial text in chunk.choices[0].delta.content
            const content = chunk?.choices?.[0]?.delta?.content;
            if (content) {
              onToken(content);
            }
            // If you want to stop early on finish_reason:
            // if (chunk.choices[0].finish_reason) { resolve(); return; }
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

  cleanup(): void {
    this.abortController.abort();
  }
}
