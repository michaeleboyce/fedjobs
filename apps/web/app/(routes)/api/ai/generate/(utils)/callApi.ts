import { CoverLetterGenerator } from "@/app/_classes/_generationClasses/CoverLetterGenerator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { GenerationSelection } from "@/app/_types/GenerationSelection";
import { callAndStreamAIResponse } from "../(utils)/callAndStream";
import { StreamingTextArray } from "@/app/_types/StreamingTextArray";
import { EssayGenerator } from "@/app/_classes/_generationClasses/EssayGenerator";

// Import your custom streams
import { OpenAIStream } from "../(utils)/OpenAIStream";
import { ClaudeStream } from "../(utils)/ClaudeStream";

export const runtime = "edge";

type ProviderType = "openai" | "anthropic";

/**
 * Calls AI API and streams the response.
 * @param request - The incoming Next.js request
 * @param createEssayGenerator - A factory function to create your generator
 * @param isParagraph - Whether we are generating a paragraph or entire document
 * @param defaultProvider - Which provider to default to if none is given in the JSON body
 */
export async function callApi(
  request: NextRequest,
  createEssayGenerator: (selection: GenerationSelection) => EssayGenerator,
  isParagraph: boolean,
  defaultProvider: ProviderType = "openai" // Defaults to Claude
) {
  const { isAuthenticated, getUser } = await getKindeServerSession();
  if (!(await isAuthenticated())) return NextResponse.error();

  const user = await getUser();
  if (!user) return NextResponse.error();

  // 1. Parse out body
  const {
    generationSelection,
    streamingTextArray,
    paragraphId,
    regenerationText,
    // Optional 'provider' in case the user wants something other than Claude
    provider,
  }: {
    generationSelection: GenerationSelection;
    streamingTextArray: StreamingTextArray;
    paragraphId: number;
    regenerationText: string;
    provider?: ProviderType;
  } = await request.json();

  // 2. Determine which provider to use (default to Anthropic/Claude)
  const chosenProvider: ProviderType = provider ?? defaultProvider;

  // 3. Build the prompt with your generator
  const generator = createEssayGenerator(generationSelection);
  const prompt = isParagraph
    ? generator.createParagraphPrompt(paragraphId, regenerationText, streamingTextArray)
    : generator.createPrompt();

  // 4. Instantiate the correct provider stream
  let providerStream;
  if (chosenProvider === "openai") {
    // Use OpenAI
    providerStream = new OpenAIStream({
      model: "gpt-4o",
      prompt,
      temperature: 0.0,
      max_tokens: 4096,
    });
  } else {
    // Default: Anthropic/Claude
    providerStream = new ClaudeStream({
      model: "claude-3-5-sonnet-20241022",
      prompt,
      temperature: 0.0,
      max_tokens: 4096,
    });
  }

  // 5. Call the streaming function with both the AI provider stream AND options
  return await callAndStreamAIResponse(providerStream, {
    prompt,
    userId: user.id,
    type: generator.documentType, // Must match what Drizzle expects
    isParagraph,
    temperature: 0.0,
    max_tokens: 4096,
    // Optionally track which provider was used
    provider: chosenProvider, 
  });
}
