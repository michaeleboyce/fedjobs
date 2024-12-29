// /apps/web/app/(routes)/api/ai/generate/(utils)/ClaudeStream.ts

import { AIProviderStream } from "./interfaces";
import Anthropic from "@anthropic-ai/sdk";
import {
  MessageStartEvent,
  ContentBlockStartEvent,
  PingEvent,
  ContentBlockDeltaEvent,
  ContentBlockStopEvent,
  MessageDeltaEvent,
  MessageStopEvent,
} from "./types"; // Adjust the import path accordingly

export class ClaudeStream implements AIProviderStream {
  private client: Anthropic;
  private stream: any; // Replace 'any' with the actual type if available

  constructor(options: {
    model: string;
    prompt: string;
    temperature: number;
    max_tokens: number;
  }) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    });;
    this.stream = this.client.messages.stream({
      messages: [{ role: "user", content: options.prompt }],
      model: options.model,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: true,
    });
  }

  async startStreaming(onToken: (token: string) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let partialJson = "";

      const onContentBlockDelta = (data: ContentBlockDeltaEvent) => {
        if (data.delta.type === "text_delta" && data.delta.text) {
          onToken(data.delta.text);
        } else if (data.delta.type === "input_json_delta" && data.delta.partial_json) {
          partialJson += data.delta.partial_json;
        }
      };

      const onContentBlockStop = (data: ContentBlockStopEvent) => {
        if (partialJson) {
          try {
            const parsedInput = JSON.parse(partialJson);
            // Process the parsed input as needed
            console.log("Parsed input JSON:", parsedInput);
          } catch (parseError) {
            console.error("Error parsing partial JSON:", parseError);
          }
          partialJson = ""; // Reset for the next content block
        }
      };

      const onMessageStop = (data: MessageStopEvent) => {
        resolve();
      };

      const onError = (data: any) => { // Replace 'any' with 'ErrorEvent' if available
        console.error("Error while streaming Claude tokens:", data.error.message);
        reject(new Error(data.error.message));
      };

      const onMessageStart = (data: MessageStartEvent) => {
        console.log("Message started:", data.message);
      };

      const onContentBlockStart = (data: ContentBlockStartEvent) => {
        console.log(`Content block ${data.index} started:`, data.content_block);
      };

      const onPing = (data: PingEvent) => {
        console.log("Ping received");
      };

      const onMessageDelta = (data: MessageDeltaEvent) => {
        console.log("Message delta:", data.delta);
      };

      // Attach event listeners
      this.stream.on("message_start", onMessageStart);
      this.stream.on("content_block_start", onContentBlockStart);
      this.stream.on("ping", onPing);
      this.stream.on("content_block_delta", onContentBlockDelta);
      this.stream.on("content_block_stop", onContentBlockStop);
      this.stream.on("message_delta", onMessageDelta);
      this.stream.on("message_stop", onMessageStop);
      this.stream.on("error", onError);
    });
  }

  cleanup(): void {
    // Remove all listeners to prevent memory leaks
    this.stream.removeAllListeners();
  }
}
