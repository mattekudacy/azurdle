const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const hits = new Map<string, { count: number; windowStart: number }>();

/** Simple in-memory per-key rate limit — ~10 requests/min.
 * NOTE: unreliable across Vercel serverless instances (each cold start has its
 * own map), but the HMAC-signed cookie already closes the one-request answer
 * extraction path, so this is a best-effort second layer, not a hard gate. */
export async function isRateLimited(key: string): Promise<boolean> {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}
