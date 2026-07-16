import type { ChatMessage, ChatOptions, ChatResult, ToolCall } from "./chat-types";

const ENDPOINT = "https://ollama.com/api/chat";
const MAX_RETRIES = 5;

function getApiKey(): string {
  const key = process.env.OLLAMA_API_KEY;
  if (!key) throw new Error("OLLAMA_API_KEY is not set");
  return key;
}

// Ollama's /api/chat happens to accept the same
// { role: "tool", tool_call_id, content } / assistant-tool_calls shape as
// the OpenAI-compatible format (confirmed against the live API) — only
// difference from github-models.ts is arguments arrives pre-parsed here,
// not as a JSON string.
function toWireMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === "assistant" && message.toolCalls) {
    return {
      role: "assistant",
      content: message.content,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        function: { name: call.name, arguments: call.arguments },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

/**
 * Calls an Ollama Cloud chat completion. Same shape/contract as
 * github-models.ts's chatComplete — see model-provider.ts for how the two
 * are swapped. Local-only dev/testing provider (see CLAUDE.md). Supports
 * tool calling (options.tools) — see chat-types.ts.
 */
export async function chatComplete(
  model: string,
  messages: ChatMessage[],
  options?: ChatOptions,
): Promise<ChatResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map(toWireMessage),
        stream: false,
        ...(options?.json ? { format: "json" } : {}),
        ...(options?.temperature !== undefined ? { options: { temperature: options.temperature } } : {}),
        ...(options?.tools
          ? {
              tools: options.tools.map((tool) => ({
                type: "function",
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
              })),
            }
          : {}),
      }),
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after")) || 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      throw new Error(`Ollama Cloud request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const message = data.message;

    if (message.tool_calls?.length) {
      const calls: ToolCall[] = message.tool_calls.map(
        (call: { id: string; function: { name: string; arguments: Record<string, unknown> } }) => ({
          id: call.id,
          name: call.function.name,
          // Ollama sends arguments pre-parsed, unlike the OpenAI-compatible
          // JSON-string format — no JSON.parse needed here.
          arguments: call.function.arguments,
        }),
      );
      return { type: "tool_calls", calls };
    }

    return { type: "text", content: message.content };
  }

  throw new Error("Ollama Cloud request exhausted retries after repeated 429s");
}
