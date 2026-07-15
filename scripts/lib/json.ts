/** Some models wrap JSON responses in a ```json fence even when told not to. */
export function parseJsonResponse<T>(content: string): T {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(stripped) as T;
}
