// /apps/web/app/(routes)/api/ai/generate/(utils)/types.ts

// Define interfaces for Claude's SSE events

export interface MessageStartEvent {
    type: "message_start";
    message: {
      id: string;
      type: "message";
      role: string;
      model: string;
      stop_sequence: string | null;
      usage: {
        input_tokens: number;
        output_tokens: number;
      };
      content: any[]; // Adjust based on actual content structure
      stop_reason: string | null;
    };
  }
  
  export interface ContentBlockStartEvent {
    type: "content_block_start";
    index: number;
    content_block: {
      type: "text" | "tool_use";
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, any>;
    };
  }
  
  export interface PingEvent {
    type: "ping";
  }
  
  export interface ContentBlockDeltaEvent {
    type: "content_block_delta";
    index: number;
    delta: {
      type: "text_delta" | "input_json_delta";
      text?: string;
      partial_json?: string;
    };
  }
  
  export interface ContentBlockStopEvent {
    type: "content_block_stop";
    index: number;
  }
  
  export interface MessageDeltaEvent {
    type: "message_delta";
    delta: {
      stop_reason: string;
      stop_sequence: string | null;
    };
    usage: {
      output_tokens: number;
    };
  }
  
  export interface MessageStopEvent {
    type: "message_stop";
  }
  
  // Union type for all possible events
  export type ClaudeStreamEvent =
    | MessageStartEvent
    | ContentBlockStartEvent
    | PingEvent
    | ContentBlockDeltaEvent
    | ContentBlockStopEvent
    | MessageDeltaEvent
    | MessageStopEvent;
  