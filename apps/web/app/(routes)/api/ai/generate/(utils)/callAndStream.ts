// File path: apps/web/app/(routes)/api/ai/generate/(utils)/callAndStream.ts
// apps/web/app/(routes)/api/ai/generate/(utils)/callAndStream.ts
import { DocumentType } from "@fedjobs/types";
import { GenerationRepository } from "@fedjobs/database";
import { aiService } from "@fedjobs/utils";

interface CallAndStreamOptions {
  userId: string;
  type: DocumentType;
  isParagraph: boolean;
}

const generationRepo = new GenerationRepository();

export async function callAndStreamAIResponse(
  streamOptions: {
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    userId: string;
  },
  options: CallAndStreamOptions
): Promise<Response> {
  try {
    // Use AIService to create the streaming response
    const { stream, getFullCompletion } = await aiService.createStreamingResponse(streamOptions);

    // Return the stream response
    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

    // Save the completion asynchronously once the stream finishes
    response.clone().body?.getReader().closed.then(async () => {
      const fullCompletion = getFullCompletion();
      try {
        await generationRepo.insert({
          userId: options.userId,
          type: options.type,
          isParagraph: options.isParagraph,
          prompt: streamOptions.prompt,
          completion: fullCompletion,
          temperature: streamOptions.temperature?.toString() ?? "0.0",
        });
      } catch (dbErr) {
        console.error("DB insertion error:", dbErr);
      }
    }).catch(err => {
      console.error("Error saving completion:", err);
    });

    return response;
  } catch (error) {
    console.error("Error in streaming:", error);
    return new Response(JSON.stringify({ error: "Streaming failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}