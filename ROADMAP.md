# Roadmap

Not yet scheduled — tracked here so they don't get lost. See `CLAUDE.md` for
the current design/security baseline these build on top of.

## Signed anonymous progress

**Problem:** `POST /api/guess` trusts `priorGuesses` as reported by the client
for anonymous play (see `src/app/api/guess/route.ts` — "Anonymous play has no
server-side session, so the client (localStorage) reports its own progress").
Clearing localStorage (incognito, a different browser, manually editing
storage) lets an anonymous player replay today's puzzle with a full 5 guesses
again. Signed-in play is unaffected — progress there is authoritative from
the `attempts` table.

**Fix:** a signed cookie (HMAC over `{ date, guesses, cluesRevealed }`) that
the server sets after each guess and validates on the next one. Keeps
anonymous play stateless server-side (no new table, no session store) while
making the client unable to forge "I haven't guessed yet" by wiping its own
storage — a cookie the client can't produce a valid signature for is
worthless to forge. Highest-impact fix of the three here: closes the one
actual cheat path, for a small, contained change.

## Rate limiting that matches the deployment

**Problem:** `src/lib/rate-limit.ts` is an in-memory `Map`, explicitly scoped
as "good enough for a ~200-service answer space." On Vercel's serverless
model, each function invocation can land on a different instance with its
own memory — the map isn't shared across instances, so the ~10/min limit is
unreliable in production even though it works fine in a single long-running
process (e.g. local dev).

**Fix:** move to a shared store. Upstash Redis has a free tier and a
drop-in `@upstash/ratelimit` package that's a near 1:1 swap for
`isRateLimited()`'s call sites — estimated ~20 minutes of work, not a
redesign.

## API route test coverage

**Problem:** `src/lib/guess.test.ts` covers the pure guess-matching logic
(`normalizeGuess`, `isCorrectGuess`) well, but nothing exercises
`POST /api/guess` itself — clue-gating (revealing exactly one new clue per
miss), game-over transitions (win/loss, `MAX_GUESSES`), and the
already-solved rejection path. These are exactly the paths a future change
is most likely to regress, and exactly the ones with zero coverage today.

**Fix:** Vitest + a mocked Supabase client (mock `createClient`/`getAttempt`/
`upsertAttempt`) driving the route handler directly, asserting on the JSON
response shape and status codes for: first guess, wrong guess reveals next
clue, correct guess ends game, guess after `gameOver` is rejected, guess on
an already-solved puzzle is rejected.
