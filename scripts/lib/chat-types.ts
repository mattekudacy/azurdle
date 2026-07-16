// Shared message/tool types both provider clients (github-models.ts,
// ollama-cloud.ts) speak, so model-provider.ts's tool-calling loop never
// needs to know which provider is active.

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export type ToolCall = {
  id: string;
  name: string;
  // Always a parsed object here, never a JSON string — github-models.ts
  // and ollama-cloud.ts each normalize their own wire format (OpenAI
  // returns arguments as a JSON string; Ollama returns it pre-parsed) so
  // nothing downstream has to know which provider produced it.
  arguments: Record<string, unknown>;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    required: string[];
    properties: Record<string, { type: string; description?: string }>;
  };
};

export type ChatResult =
  | { type: "text"; content: string }
  | { type: "tool_calls"; calls: ToolCall[] };

export type ChatOptions = {
  json?: boolean;
  temperature?: number;
  tools?: ToolDefinition[];
};
