// File path: apps/web/app/(routes)/api/ai/generate/(utils)/callApi.ts
// File: apps/web/app/(routes)/api/ai/generate/(utils)/callApi.ts

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { callAndStreamAIResponse } from "./callAndStream";
import { GenerationSelection } from "@/app/_types/GenerationSelection";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { EssayGenerator } from "@/app/_classes/_generationClasses/EssayGenerator";

import { OpenAIStream } from "./OpenAIStream";
import { ClaudeStream } from "./ClaudeStream";

export const runtime = "edge";

export async function callApi(
  request: NextRequest,
  createEssayGenerator: (selection: GenerationSelection) => EssayGenerator,
  isParagraph: boolean
) {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) return NextResponse.error();

  const user = await getUser();
  if (!user) return NextResponse.error();

  // 1. Parse body
  const {
    generationSelection,
    streamingTextArray,
    paragraphId,
    regenerationText,
    model, // e.g. "o1-mini", "o1", "gpt-4o", "claude-3-5-sonnet-20241022", etc.
  }: {
    generationSelection: GenerationSelection;
    streamingTextArray: StreamingTextArray;
    paragraphId: number;
    regenerationText: string;
    model?: string;
  } = await request.json();

  // 2. Build your prompt
  const generator = createEssayGenerator(generationSelection);
  const prompt = isParagraph
    ? generator.createParagraphPrompt(paragraphId, regenerationText, streamingTextArray)
    : generator.createPrompt();

  // 3. Decide which model stream to create
  //    We'll handle "o1" or "o1-mini" differently since they need max_completion_tokens, no temperature, etc.
  let providerStream;
  let usedModel = model ?? "claude-3-5-sonnet-20241022"; // default to Claude if nothing passed

  if (usedModel === "o1" || usedModel === "o1-mini") {
    // o1-series: use max_completion_tokens, no 'temperature', etc.
    providerStream = new OpenAIStream({
      model: usedModel,
      prompt,
      // remove or omit 'temperature'
      // remove or omit 'top_p', 'presence_penalty', 'frequency_penalty', etc.
      max_completion_tokens: 10000, // set a sensible limit to ensure reasoning tokens have room
    });
  } else if (usedModel === "gpt-4o" || usedModel === "o1-preview") {
    // Old style models that still accept max_tokens
    providerStream = new OpenAIStream({
      model: usedModel,
      prompt,
      temperature: 0.0, // these older GPT-based models can still use temperature
      max_tokens: 4096,
    });
  } else if (usedModel.startsWith("claude")) {
    // If it’s a Claude model
    providerStream = new ClaudeStream({
      model: usedModel,
      prompt,
      temperature: 0.0,
      max_tokens: 4096,
    });
  } else {
    // Fallback or unrecognized => default to Claude
    usedModel = "claude-3-5-sonnet-20241022";
    providerStream = new ClaudeStream({
      model: usedModel,
      prompt,
      temperature: 0.0,
      max_tokens: 4096,
    });
  }

  // 4. Stream the response
  return await callAndStreamAIResponse(providerStream, {
    prompt,
    userId: user.id,
    type: generator.documentType,
    isParagraph,
    // We'll pass temperature=0 for non-o1 models
    temperature: 0.0,
    max_tokens: 4096,
    provider: usedModel.includes("claude") ? "anthropic" : "openai",
  });
}
