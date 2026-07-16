import type { ChatMessage, ChatOptions, ChatResult, ToolCall } from "./chat-types";

const ENDPOINT = "https://models.github.ai/inference/chat/completions";
const MAX_RETRIES = 5;

function getToken(): string {
  const token = process.env.GITHUB_MODELS_TOKEN;
  if (!token) throw new Error("GITHUB_MODELS_TOKEN is not set");
  return token;
}

// OpenAI-compatible wire format: assistant tool_calls carry
// function.arguments as a JSON *string*; a tool-result message is
// { role: "tool", tool_call_id, content }.
function toWireMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === "assistant" && message.toolCalls) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

/**
 * Calls a GitHub Models chat completion. Build/cron-time only — never call
 * from app runtime (see CLAUDE.md). Backs off on 429s per the free-tier
 * rate limit. Supports tool calling (options.tools) — see chat-types.ts.
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
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map(toWireMessage),
        ...(options?.json ? { response_format: { type: "json_object" } } : {}),
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
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
      throw new Error(`GitHub Models request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;

    if (message.tool_calls?.length) {
      const calls: ToolCall[] = message.tool_calls.map(
        (call: { id: string; function: { name: string; arguments: string } }) => ({
          id: call.id,
          name: call.function.name,
          // OpenAI-compatible wire format sends arguments as a JSON string.
          arguments: JSON.parse(call.function.arguments),
        }),
      );
      return { type: "tool_calls", calls };
    }

    return { type: "text", content: message.content };
  }

  throw new Error("GitHub Models request exhausted retries after repeated 429s");
}
