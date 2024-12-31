// File path: apps/web/app/(routes)/api/ai/generate/(utils)/types.d.ts
// /apps/web/app/(routes)/api/ai/generate/(utils)/types.d.ts

import "@anthropic-ai/sdk";
import {
  MessageStartEvent,
  ContentBlockStartEvent,
  PingEvent,
  ContentBlockDeltaEvent,
  ContentBlockStopEvent,
  MessageDeltaEvent,
  MessageStopEvent,
} from "./types"; // Adjust the import path accordingly

declare module "@anthropic-ai/sdk" {
  interface MessageStreamEvents {
    "message_start": MessageStartEvent;
    "content_block_start": ContentBlockStartEvent;
    "ping": PingEvent;
    "content_block_delta": ContentBlockDeltaEvent;
    "content_block_stop": ContentBlockStopEvent;
    "message_delta": MessageDeltaEvent;
    "message_stop": MessageStopEvent;
  }
}
