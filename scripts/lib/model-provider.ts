import { chatComplete as chatCompleteGithub } from "./github-models";
import { chatComplete as chatCompleteOllama } from "./ollama-cloud";

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

export function chatComplete(
  model: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { json?: boolean; temperature?: number },
): Promise<string> {
  return PROVIDER === "ollama"
    ? chatCompleteOllama(model, messages, options)
    : chatCompleteGithub(model, messages, options);
}
