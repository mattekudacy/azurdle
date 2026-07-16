import { chatComplete as chatCompleteGithub } from "./github-models";
import { chatComplete as chatCompleteOllama } from "./ollama-cloud";
import type { ChatMessage, ChatOptions, ToolCall, ToolDefinition } from "./chat-types";

/**
 * Swappable AI provider for puzzle generation/calibration. GitHub Models
 * (the default, unset or any value other than "ollama") is the standing
 * production provider — used by the daily Actions cron. Set
 * MODEL_PROVIDER=ollama to use Ollama Cloud instead; this is a local-only
 * dev/testing convenience (its free tier has tighter session/weekly caps
 * than makes sense for production, and it's simply not the provider this
 * project runs on) — never set it in the daily cron's Actions secrets. See
 * CLAUDE.md: whichever provider is active must stay a build/cron-time-only
 * tool, never called from app runtime.
 */
const PROVIDER = process.env.MODEL_PROVIDER === "ollama" ? "ollama" : "github";

// Each provider names its default drafting/judging model differently.
// Calibration and generation both import MODEL from here rather than
// hardcoding a provider-specific name.
export const MODEL = PROVIDER === "ollama" ? "gpt-oss:120b-cloud" : "openai/gpt-4o";

function chatComplete(model: string, messages: ChatMessage[], options?: ChatOptions) {
  return PROVIDER === "ollama"
    ? chatCompleteOllama(model, messages, options)
    : chatCompleteGithub(model, messages, options);
}

/**
 * Plain text completion — for the (still-common) case where no tool is
 * involved. Throws if the model unexpectedly returns tool_calls instead of
 * text; callers that pass `tools` should use runWithTools instead.
 */
export async function chatText(
  model: string,
  messages: { role: "system" | "user"; content: string }[],
  options?: Omit<ChatOptions, "tools">,
): Promise<string> {
  const result = await chatComplete(model, messages, options);
  if (result.type === "tool_calls") {
    throw new Error("chatText received tool_calls but no tools were provided to handle them");
  }
  return result.content;
}

const MAX_TOOL_ROUNDS = 3;

/**
 * Runs a bounded tool-calling loop: call the model, and if it requests a
 * tool, execute the matching local implementation, feed the result back,
 * and call again — up to MAX_TOOL_ROUNDS times — then return final text.
 * Both provider clients normalize their own wire-format quirks (see
 * github-models.ts / ollama-cloud.ts) so this loop is provider-agnostic.
 */
export async function runWithTools(
  model: string,
  initialMessages: { role: "system" | "user"; content: string }[],
  tools: ToolDefinition[],
  toolImpls: Record<string, (args: Record<string, unknown>) => Promise<string>>,
  options?: Omit<ChatOptions, "tools">,
): Promise<string> {
  const messages: ChatMessage[] = [...initialMessages];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const result = await chatComplete(model, messages, { ...options, tools });

    if (result.type === "text") return result.content;

    // Model asked for tool(s), but we've already spent the round budget —
    // stop looping and force a final plain-text answer using whatever it
    // has learned so far, rather than looping forever on an uncooperative
    // model.
    if (round === MAX_TOOL_ROUNDS) {
      const forced = await chatComplete(
        model,
        [
          ...messages,
          {
            role: "user",
            content: "Stop calling tools now. Give your final answer as plain text based on what you know so far.",
          },
        ],
        options,
      );
      return forced.type === "text" ? forced.content : "";
    }

    messages.push({ role: "assistant", content: "", toolCalls: result.calls });

    for (const call of result.calls) {
      const impl = toolImpls[call.name];
      const toolResult = impl
        ? await impl(call.arguments).catch((err) => `Tool error: ${err instanceof Error ? err.message : err}`)
        : `Unknown tool: ${call.name}`;
      messages.push({ role: "tool", toolCallId: call.id, content: toolResult });
    }
  }

  // Unreachable — the loop always returns inside the round cap above — but
  // keeps TypeScript happy about the function's return type.
  return "";
}

export type { ToolCall, ToolDefinition };
