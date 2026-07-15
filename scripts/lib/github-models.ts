const ENDPOINT = "https://models.github.ai/inference/chat/completions";
const MAX_RETRIES = 5;

function getToken(): string {
  const token = process.env.GITHUB_MODELS_TOKEN;
  if (!token) throw new Error("GITHUB_MODELS_TOKEN is not set");
  return token;
}

/**
 * Calls a GitHub Models chat completion. Build/cron-time only — never call
 * from app runtime (see CLAUDE.md). Backs off on 429s per the free-tier
 * rate limit.
 */
export async function chatComplete(
  model: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { json?: boolean; temperature?: number },
): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        ...(options?.json ? { response_format: { type: "json_object" } } : {}),
        ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
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
    return data.choices[0].message.content;
  }

  throw new Error("GitHub Models request exhausted retries after repeated 429s");
}
