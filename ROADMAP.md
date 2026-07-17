# Roadmap

Not yet scheduled — tracked here so they don't get lost. See `CLAUDE.md` for
the current design/security baseline these build on top of.

## ~~Signed anonymous progress~~ ✓ done

**Problem:** `POST /api/guess` trusted `priorGuesses` as reported by the client
for anonymous play, letting anyone forge "I haven't guessed yet" by wiping their
storage — or worse, forge 4 prior guesses in a single request to reach `gameOver`
and extract today's answer in one unauthenticated call.

**Fix shipped:** `src/lib/anon-progress.ts` — HMAC-signed cookie
(`azurdle-progress`, `httpOnly`, `sameSite=lax`) that the server sets after each
anonymous guess and validates on the next one. The `priorGuesses` field was
removed from the request schema entirely. Signed-in play still uses the
`attempts` table as the authoritative source.

**Required env var:** `ANONYMOUS_PROGRESS_SECRET` — a 32-byte hex secret
(generate with `openssl rand -hex 32`). Add it to Vercel env settings and your
local `.env.local`.

## Rate limiting (kept in-memory, intentionally)

**Status:** the in-memory `Map` is still in place. It's unreliable across Vercel
serverless instances, but the HMAC-signed cookie now closes the actual exploit
path (one-request answer extraction). The rate limiter is a best-effort second
layer — not a hard gate. No shared store added.

## ~~API route test coverage~~ ✓ done

**Problem:** no tests exercised `POST /api/guess` itself — clue-gating, game-over
transitions, the already-solved rejection path, or the anonymous cookie path.

**Fix shipped:**
- `src/lib/anon-progress.test.ts` — 6 unit tests for the HMAC round-trip and
  tamper detection.
- `src/app/api/guess/route.test.ts` — 14 integration tests covering: anon fresh
  start, anon wrong guess reveals next clue, anon correct guess, anon alias guess,
  cookie-carry-over, stale-date cookie ignored, priorGuesses body field ignored,
  authenticated path, already-solved rejection, future date rejection, puzzle not
  found, malformed body, rate limit 429, x-forwarded-for last-hop extraction.

## ~~Vocab expansion~~ ✓ done

**Problem:** 70 services + 90-day exclusion left ~43 eligible at any time —
regulars would meta-game recency.

**Fix shipped:** `public/vocab/services.json` expanded from 70 → 144 distinct
Azure services. Organized by category (compute, containers, storage, databases,
networking, security, messaging, AI/ML, IoT, devtools, monitoring). No
duplicates.

## ~~Streaks / stats endpoint~~ ✓ done

**Fix shipped:** `GET /api/stats` (auth required) — returns `totalPlayed`,
`totalSolved`, `solveRate`, `currentStreak`, `maxStreak`, `solveDistribution`
(solve count by clue number 1–5). Pure SQL query over the existing `attempts`
table; no new schema required.

## ~~x-forwarded-for spoofing fix~~ ✓ done

**Fix shipped:** rate limiter now keys on the *last* hop in the
`x-forwarded-for` chain (`.split(",").at(-1).trim()`), which is the value Vercel
appended (unforgeable), not the first which an attacker can spoof.

## ~~migrate overwrites wins bug~~ ✓ done

**Fix shipped:** skip condition in `POST /api/migrate` now also checks
`existing.solved` — prevents a stale localStorage attempt from overwriting a
server-side solved record.

---

## Pokedle attribute comparison (P3 — plan separately)

The attribute comparison mechanic from Pokédle slots in naturally on top of the
existing architecture. `services.json` evolves from `string[]` to `ServiceEntry[]`
objects (name, category, computeModel, launchYear, pricingModel, awsEquivalent).
`POST /api/guess` returns an attribute comparison object for wrong guesses
alongside (or instead of) the next prose clue. The existing clue ladder becomes
a progressive hint system that unlocks every couple of misses.

This is a session-scale refactor with real product value. Do after the
foundation is solid. Requires:
1. Schema migration: `services.json` → objects
2. Autocomplete client update
3. `/api/guess` response shape change (backwards-compat consideration)
4. New UI component for attribute comparison grid
5. Comparison logic (pure, trivially testable)
