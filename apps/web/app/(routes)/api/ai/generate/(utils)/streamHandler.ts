// File path: apps/web/app/(routes)/api/ai/generate/(utils)/streamHandler.ts
// apps/web/app/(routes)/api/ai/generate/(utils)/streamHandler.ts
// Refactored to use GenerationRepository for saving streaming results.
import { DocumentType } from "@fedjobs/types";
import { AIProviderStream } from "./interfaces";
// Import the GenerationRepository.
import { GenerationRepository } from "@fedjobs/database";

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

const generationRepo = new GenerationRepository();

/**
 * Handles the streaming process for an AI provider.
 * After streaming, saves the full completion text via the GenerationRepository.
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
      } catch (error: unknown) {
        console.error(`Error while streaming tokens:`, error);
        if (error instanceof Error) {
          controller.error(`Error while streaming tokens: ${error.message}`);
        } else {
          controller.error(`Error while streaming tokens: ${String(error)}`);
        }
      } finally {
        controller.close();

        try {
          // Save the generation using the GenerationRepository.
          await generationRepo.insert({
            userId: options.userId,
            type: options.type,
            isParagraph: options.isParagraph,
            prompt: options.prompt,
            completion: fullCompletion,
            temperature: options.temperature.toString(),
          });
        } catch (dbErr) {
          console.error("DB insertion error:", dbErr);
        }

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
