// File path: apps/web/app/(routes)/api/ai/generate/(utils)/ClaudeStream.ts
// ClaudeStream.ts (final version)
import { AIProviderStream } from "./interfaces";
import Anthropic from "@anthropic-ai/sdk";

export class ClaudeStream implements AIProviderStream {
  private stream: ReturnType<Anthropic["messages"]["stream"]>;

  constructor(options: {
    model: string;
    prompt: string;
    temperature: number;
    max_tokens: number;
  }) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
    this.stream = client.messages.stream({
      messages: [{ role: "user", content: options.prompt }],
      model: options.model,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: true,
    });
  }

  async startStreaming(onToken: (token: string) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.stream.on("text", (text: string) => {
        onToken(text);
      });
      this.stream.on("end", () => resolve());
      this.stream.on("error", (err: any) => reject(err));
    });
  }

  cleanup(): void {
    //this.stream.removeAllListeners();
  }
}

