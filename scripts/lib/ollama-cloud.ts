const ENDPOINT = "https://ollama.com/api/chat";
const MAX_RETRIES = 5;

function getApiKey(): string {
  const key = process.env.OLLAMA_API_KEY;
  if (!key) throw new Error("OLLAMA_API_KEY is not set");
  return key;
}

/**
 * Calls an Ollama Cloud chat completion. Same shape/contract as
 * github-models.ts's chatComplete — see provider.ts for how the two are
 * swapped. Temporary stand-in while GitHub Models' free-tier rate limit is
 * exhausted (see CLAUDE.md).
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
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(options?.json ? { format: "json" } : {}),
        ...(options?.temperature !== undefined ? { options: { temperature: options.temperature } } : {}),
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
    return data.message.content;
  }

  throw new Error("Ollama Cloud request exhausted retries after repeated 429s");
}
