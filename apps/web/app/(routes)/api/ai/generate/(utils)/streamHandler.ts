// /apps/web/app/(routes)/api/ai/generate/(utils)/streamHandler.ts

import { ReadableStream } from "web-streams-polyfill/ponyfill"; // Ensure compatibility
import { db } from "@fedjobs/database";
import { generations as generationsTable } from "@fedjobs/database";
import { DocumentType } from "@fedjobs/types";
import { AIProviderStream } from "./interfaces";

interface CallAndStreamOptions {
  prompt: string;
  userId: string;
  type: DocumentType;
  isParagraph: boolean;
  temperature: number;
  max_tokens: number;
  model?: string;
  provider?: "openai" | "anthropic";
}

/**
 * Handles the streaming process for any AI provider implementing AIProviderStream.
 */
export async function handleStreaming(
  providerStream: AIProviderStream,
  options: CallAndStreamOptions
): Promise<Response> {
  let fullCompletion = "";
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        await providerStream.startStreaming((token: string) => {
          fullCompletion += token;
          controller.enqueue(encoder.encode(token));
        });
      } catch (error: unknown) { // Explicitly type error as unknown
        console.error(`Error while streaming tokens:`, error);

        if (error instanceof Error) {
          controller.error(`Error while streaming tokens: ${error.message}`);
        } else {
          controller.error(`Error while streaming tokens: ${String(error)}`);
        }
      } finally {
        controller.close();

        try {
          await db.insert(generationsTable).values({
            prompt: options.prompt,
            type: options.type,
            isParagraph: options.isParagraph,
            userId: options.userId,
            completion: fullCompletion,
            temperature: options.temperature.toString(),
          });
        } catch (dbErr) {
          console.error("DB insertion error:", dbErr);
        }

        // Cleanup the provider stream
        providerStream.cleanup();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
