const ENDPOINT = "https://api.tavily.com/search";

function getApiKey(): string {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY is not set");
  return key;
}

/**
 * Web search for fact-verification during puzzle calibration (see
 * calibration.ts's passesFactCheck). Build/cron-time only, same as the AI
 * providers — never called from app runtime. Free tier: 1,000 credits/
 * month, no card required.
 */
export async function tavilySearch(query: string): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: 3,
      search_depth: "basic",
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const results = (data.results ?? []) as { title: string; url: string; content: string }[];

  if (results.length === 0) return "No search results found.";

  // Compact text summary, not the raw JSON — this goes back to the model
  // as a tool-result message, so it should read like a search snippet, not
  // a payload to re-parse.
  return results
    .map((r, i) => `${i + 1}. ${r.title} (${r.url})\n${r.content}`)
    .join("\n\n");
}
