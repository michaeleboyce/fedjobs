// File path: apps/web/app/(routes)/api/ai/generate/(utils)/callApi.ts
// apps/web/app/(routes)/api/ai/generate/(utils)/callApi.ts
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { callAndStreamAIResponse } from "./callAndStream";
import { GenerationSelection } from "@/app/features/generation/types/GenerationSelection";
import { EssayGenerator } from "@/app/features/generation/generators/EssayGenerator";

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

  // Parse body
  const {
    generationSelection,
    streamingTextArray,
    paragraphId,
    regenerationText,
    model,
  } = await request.json();

  // Build prompt
  const generator = createEssayGenerator(generationSelection);
  const prompt = isParagraph
    ? generator.createParagraphPrompt(paragraphId, regenerationText, streamingTextArray)
    : generator.createPrompt();

  // Use AIService to handle streaming regardless of model
  const streamOptions = {
    model: model || "claude-3-7-sonnet-20250219", // Default if not specified
    prompt,
    temperature: 0.0,
    maxTokens: 4096,
    userId: user.id
  };

  // Handle the streaming response
  return await callAndStreamAIResponse(
    streamOptions,
    {
      userId: user.id,
      type: generator.documentType,
      isParagraph,
    }
  );
}