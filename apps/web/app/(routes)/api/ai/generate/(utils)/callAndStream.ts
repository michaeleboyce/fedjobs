"use server";

import { db } from "@fedjobs/database";
import { generations as generationsTable } from "@fedjobs/database";
import type { DocumentType } from "@fedjobs/types";

import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";
import { openai } from "@ai-sdk/openai";

/**
 * Streams an LLM response and saves the final text in your DB.
 */
export async function callAndStreamAIResponse(
  prompt: string,
  userId: string,
  type: DocumentType,
  isParagraph: boolean,
  temperature: number,
  max_tokens: number,
  model: string = "gpt-4o"
) {
  // Create an empty streamable value that we'll update with the tokens
  const stream = createStreamableValue("");

  // Kick off the streaming in an async IIFE
  (async () => {
    // Start the stream
    const { textStream } = streamText({
      model: openai(model), // e.g. "gpt-4o"
      prompt,
      // We won't use onCompletion here— we can save to DB after we gather all tokens
    });

    let completeText = "";

    // Iterate through each delta token
    for await (const delta of textStream) {
      completeText += delta; // Accumulate the text
      stream.update(delta);  // Send this chunk to any consumers
    }

    // The stream is done
    stream.done();

    // Now that we have the entire output, insert a record in DB
    await db.insert(generationsTable).values({
      userId,
      type, 
      isParagraph,
      prompt,
      completion: completeText,
      temperature: temperature.toFixed(1),
    });
  })();

  // Return an object with the streamable value for the client to consume
  return { output: stream.value };
}
