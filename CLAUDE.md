# CLAUDE.md

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This project uses Next.js 16, which has breaking changes vs. earlier versions in your
training data — APIs, conventions, and file structure may differ. Read the relevant guide
in `node_modules/next/dist/docs/` before writing Next.js-specific code. Heed deprecation
notices.
<!-- END:nextjs-agent-rules -->

## Project overview

**Azurdle** is a daily "Doctordle-style" guessing game for Azure services. Every day, all
players get the same puzzle: a hidden Azure service revealed through 5 progressive clues
that go from a broad business problem to a dead giveaway. Players have 5 guesses; each
wrong guess or skip reveals the next clue. Fewer clues used = better rating.

Everything must run on **free tiers** — this project's budget is $0/month. Never introduce
a dependency, plan upgrade, or paid service without flagging it explicitly.

## Stack

- **Hosting:** Vercel Hobby tier (non-commercial license — no ads/monetization without Pro).
- **Framework:** Next.js (App Router, TypeScript). Frontend + API route handlers in one
  repo, deployed on push to `main`.
- **Database + auth:** Supabase free tier (Postgres, OAuth sign-in, row-level security).
  Use `@supabase/ssr` for session handling in Next.js.
- **Puzzle generation:** GitHub Models (free inference via PAT) — build-time drafting
  tool ONLY, never a runtime dependency. See "Puzzle content" below.
- **Domain:** TBD. The domain lives in exactly ONE env var (`SITE_DOMAIN`). Never hardcode it in components or share text.

## Repo visibility

This repo is **public**. That's why puzzle content never touches git (see "Puzzle
content" below) — a public repo's file history is permanent and readable by anyone,
which would leak up to 14 days of unplayed future puzzles under the rolling buffer if
answers were ever committed here. Generation writes straight to Supabase instead.

Anonymous players can play today's puzzle (progress in localStorage). Signing in unlocks
the archive of past unfinished puzzles and syncs progress. On first sign-in, migrate
localStorage progress to the user's account, then clear it.

## Critical security rule: the answer never leaves the server

This is the load-bearing design decision. Original Wordle shipped its answer list to the
client and was datamined within days. Do not repeat that mistake.

- The client only ever receives **revealed** clues, one at a time.
- `GET /api/puzzle/today` returns clue 1 only — never the answer, never clues 2–5.
- `POST /api/guess` validates server-side and returns `{ correct, nextClue?, gameOver? }`.
- The answer is included in a response ONLY after the game ends (solved or out of guesses).

**Supabase-specific enforcement:**

- The `puzzles` table is SERVER-ONLY. RLS denies ALL access for `anon` and `authenticated`
  roles. Only API route handlers read it, using the service-role key.
- The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is server-only: never in client code,
  never in `NEXT_PUBLIC_*` env vars, never logged.
- The client NEVER queries `puzzles` directly — not even for metadata. All puzzle data
  flows through the API routes. Treat any client-side Supabase query against `puzzles`
  as a bug.
- `attempts` MAY be accessed from the client under RLS policy `user_id = auth.uid()`
  (select/insert/update own rows only).
- The autocomplete vocabulary (service names + decoys, no answers) is safe to ship to
  the client as a static JSON asset.

## Database schema (Supabase Postgres)

```sql
-- server-only: RLS enabled, no policies for anon/authenticated
create table puzzles (
  date         date primary key,
  number       int unique not null,
  answer       text not null,
  aliases      text[] not null default '{}',
  clues        jsonb not null,            -- array of exactly 5 strings
  category     text not null,
  difficulty   text not null check (difficulty in ('easy','medium','hard')),
  status       text not null default 'queued'
               check (status in ('queued','live','retired','reserve')),
  created_at   timestamptz not null default now()
);

-- client-accessible under RLS: user_id = auth.uid()
create table attempts (
  user_id        uuid references auth.users not null,
  puzzle_date    date not null,
  guesses        jsonb not null default '[]',
  clues_revealed int not null default 1,
  solved         boolean not null default false,
  completed_at   timestamptz,
  primary key (user_id, puzzle_date)
);
```

Conventions:

- Puzzle dates and the daily rollover are **UTC**. "Today's puzzle" = row where
  `date = current UTC date`. Never use server local time or client time.
- One `attempts` row per user per puzzle date — upsert on conflict.
- Auth users come from Supabase Auth (`auth.users`); do not build a parallel users table
  unless profile fields are actually needed.

## API surface

| Endpoint                 | Auth      | Behavior                                                                                     |
| ------------------------ | --------- | -------------------------------------------------------------------------------------------- |
| `GET /api/puzzle/today`  | anonymous | Puzzle number, date, category, clue 1. Merges saved progress if signed in.                   |
| `POST /api/guess`        | anonymous | Body `{ date, guess }`. Validates, returns result + next clue. Upserts attempt if signed in. |
| `GET /api/archive`       | required  | Past puzzle dates with the user's completion state.                                          |
| `GET /api/puzzle/[date]` | required  | Past puzzle (clues up to the user's progress). Reject future dates.                          |
| `POST /api/migrate`      | required  | One-time import of localStorage progress after first sign-in.                                |

Rules:

- Reject guesses for future dates and for puzzles the user already solved.
- Rate-limit `POST /api/guess` (~10/min per IP/session) — the answer space is only ~200
  services and must not be brute-forceable. Simple per-IP check is fine initially.
- Guess matching: normalize both sides (lowercase, strip `azure `/`microsoft ` prefix,
  strip non-alphanumerics), then compare against `answer` and `aliases`.
  Aliases matter: "AKS" ≡ "Azure Kubernetes Service"; "Azure AD" ≡ "Microsoft Entra ID".

## Puzzle content: the clue ladder

Every puzzle has exactly 5 clues following this ladder. Each clue should roughly halve
the candidate set (clue 1 fits ~15 services, clue 5 fits exactly 1):

1. **The problem, with one fingerprint.** Plain business language, no Azure jargon, but
   containing one distinctive detail that gives an expert a genuine (~30–40%) shot.
   Test: could a certified Azure architect name the service from this sentence alone,
   better than chance? Could a junior dev? The answer should be yes/no respectively.
2. **The constraint** that eliminates half the candidates.
3. **The architecture behavior** — narrows to a category or 2–3 sibling services.
4. **The telltale term of art** — vocabulary only this service (and maybe one close
   confuser) uses. Prefer terms that distinguish commonly confused pairs
   (Functions vs Logic Apps, Load Balancer vs Application Gateway, Service Bus vs Event Hubs).
5. **The giveaway** — AWS equivalent, abbreviation, or unique product fact.

Content rules:

- Avoid clues that go stale: no exact prices, no tier names Microsoft shuffles often.
  Service renames happen (Azure AD → Entra ID) — put old names in `aliases`.
- The daily cron maintains a rolling 14-day queued buffer (see pipeline below), plus a
  reserve pool of ~10 evergreen puzzles as the runtime fallback.

### Generation pipeline (AI model + daily cron)

Puzzles are generated by a **daily GitHub Actions scheduled workflow** — not Vercel cron
(Hobby cron and function timeouts are too limited for a multi-call generation job, and
provider credentials already live in Actions secrets).

**Provider: GitHub Models (the default) is the standing production provider** — used
by the daily Actions cron. `scripts/lib/model-provider.ts` reads `MODEL_PROVIDER`
(unset or anything other than `"ollama"` → GitHub Models; `"ollama"` → Ollama Cloud)
and routes every call through the matching client (`github-models.ts` or
`ollama-cloud.ts`), each exposing an internal `chatComplete` with the same
`ChatMessage[]` / `ChatOptions` / `ChatResult` shapes (`scripts/lib/chat-types.ts`).
Callers use one of two public entry points instead of the raw `chatComplete`:
- `chatText(model, messages, options)` — plain text, throws if the model
  unexpectedly tries to call a tool.
- `runWithTools(model, messages, tools, toolImpls, options)` — a bounded loop
  (`MAX_TOOL_ROUNDS`, currently 3) that executes local tool implementations and
  feeds results back until the model returns final text.

Each provider client normalizes its own wire-format quirks for tool calls before
returning — GitHub Models' OpenAI-compatible format sends `function.arguments` as a
JSON *string*; Ollama Cloud sends it pre-parsed as an object. Callers of
`chatText`/`runWithTools` never see this difference.

**Ollama Cloud is a local-only dev/testing convenience, never used in the production
cron.** Set `MODEL_PROVIDER=ollama` locally when iterating on the generation pipeline
(e.g. GitHub Models' free-tier rate limit is exhausted mid-session) — never set it in
the daily workflow's Actions secrets. Its free tier ("Light usage") has tighter
session/weekly caps than makes sense for anything beyond ad hoc local testing.

Both providers are build/cron-time tools ONLY — never call either from app runtime
(adds latency, hits rate limits, and is a hard dependency the running app should never
have).

**Buffer rule — the single most important pipeline invariant:** the cron generates the
puzzle for **today + 14 days**, never for today or tomorrow. The queue is a rolling
two-week buffer. A failed run just shrinks the buffer by one day and the next run
catches up; it never breaks the live game.

**Puzzle content never touches git.** This repo is public — generation writes directly
to Supabase as `status = 'queued'` instead of committing a JSON file and opening a PR.
See "Repo visibility" above for why.

**There is no human review step.** `calibrate()` (`scripts/lib/calibration.ts`) is the
entire review gate — two model-graded checks run inline before a puzzle is ever
inserted:

1. **Difficulty (clues 1–3):** feed clues 1–3 → if the model cannot shortlist the
   service, the ladder is too vague → regenerate.
2. **Fact/structure check:** feed the full answer + clues to a model and ask it to
   verify the same things a human reviewer used to check — facts correct and current,
   clue 5 identifies exactly one service, and clues strictly increase in specificity
   with no earlier clue giving it away. Any failure → regenerate. This step has a
   **web search tool available** (`search_web`, backed by Tavily —
   `scripts/lib/tavily.ts`, `TAVILY_API_KEY`, free tier 1,000 credits/month) via
   `runWithTools()`. The model decides when to search (the tool's description tells
   it to reach for search when uncertain, especially for newer/less-common Azure
   services) — it's not forced on every call. This exists because the drafting
   model's training data can be stale or thin for services it doesn't know well,
   which matters more now that answers are constrained to the full `services.json`
   vocab (see below) rather than only what the model already knows confidently.

**A third check — clue-1 solo-guess difficulty — was tried and removed.** It sampled 5
guesses from clue 1 alone and rejected the puzzle if an LLM landed the answer 4+ of 5
times. In practice it rejected nearly every draft (routinely 5/5), even after two
rounds of prompt tuning and a targeted revise-clue-1-with-feedback loop. A blind human
read of the actual rejected clues (with the answer hidden) settled it: they read as
genuinely fair and ambiguous — the check was measuring "can a top-tier LLM
pattern-match a service from a business description," which is a much narrower, sharper
skill than "would a human Azure professional find this appropriately hard" (the actual
target — PRODUCT.md's audience is human Azure engineers, not an AI judge). **Do not
re-add an automated clue-1 solvability check without first doing a human blind read of
several real rejected/accepted clues** — this exact mistake (optimizing an LLM proxy
metric instead of checking it against a human read) cost a full session of debugging
before anyone looked at the actual clue text.

Cap at `MAX_REGENERATION_ATTEMPTS` (3) attempts, each a full redraft (one API call
drafts the answer + all 5 clues together). After the cap, fail the run (the 14-day
buffer absorbs it).

Daily workflow (`.github/workflows/generate-puzzle.yml`):

1. `scripts/generate-puzzles.ts` calls the active provider with a prompt embedding the
   full clue-ladder spec, the JSON schema, and the **eligible answer list**: every
   service in `public/vocab/services.json` MINUS any used in the last 90 days or
   already sitting as a `reserve` puzzle. The model MUST pick its answer from this
   list (not free-associate a service name) — see "Answers come from the vocab list"
   below for why.
2. Structural validation: schema check (exactly 5 clues, valid category/difficulty,
   non-empty aliases), and the answer is re-checked against the eligible list
   (case/prefix-insensitive via `normalizeGuess`) — if the model ignored the
   constraint and invented or misspelled an answer, discard and redraft.
3. `calibrate()` (the two checks above) — any failure discards the puzzle and
   redrafts from scratch.
4. On success: **insert the row directly into Supabase** with `status = 'queued'` and
   a real `date`/`number` already assigned (today+14, next sequential number). It's
   immediately servable once its date arrives — no further gate.

**Answers come from the vocab list, not the model's free association.** Without this
constraint, the drafting model only ever proposes services it already "knows" well
enough to think of unprompted — a newly-added `services.json` entry (e.g. Microsoft
Foundry) could sit in the autocomplete list forever without ever being chosen as an
actual answer, even though players could search for and guess it. `draftPuzzle()`'s
prompt states the eligible list explicitly and instructs the model to copy the exact
spelling; `generateOne()` re-validates the returned answer against that same list
(normalized) before accepting it, and snaps to the vocab's exact spelling on a
near-match (different casing/whitespace) so the stored answer stays consistent with
what autocomplete offers.

**Reserve pool fallback:** keep ~10 evergreen puzzles with `status = 'reserve'`. If
`GET /api/puzzle/today` finds no queued/live puzzle for the current UTC date (empty
buffer, yanked puzzle), it serves the next reserve puzzle instead and marks it used.
The failure mode must always be "a reserve puzzle ran", never "the site had no
puzzle". Alert (Actions issue/email) when reserves drop below 5 or the queued buffer
drops below 7 days.

General rules:

- Whichever AI provider is active is a build/cron-time tool ONLY. Never call it from
  app runtime — free tiers are rate-limited and it would add latency and a hard
  dependency. Back off and retry on 429s inside the client (both providers implement
  this the same way).
- Provider credentials (`GITHUB_MODELS_TOKEN`, `OLLAMA_API_KEY`, `TAVILY_API_KEY`) live
  in local env vars only, never committed. In GitHub Actions, the PAT is stored under
  the secret name `MODELS_PAT` (Actions rejects secret names starting with `GITHUB_` —
  reserved for GitHub's own auto-populated vars) and mapped onto the
  `GITHUB_MODELS_TOKEN` env var name inside the workflow, which is what the code
  actually reads. `TAVILY_API_KEY` needs no such renaming — add it as-is to Actions
  secrets.
- Generated output goes straight into Supabase as `queued` — NEVER into a
  git-committed file. There is no human approval step; `calibrate()` is the only gate,
  so if you touch that function or its threshold, you're changing what the ENTIRE
  review process catches.

## Design System

### Layout & Structure

The game interface uses a **two-column layout** for optimal gameplay experience:

**Header Section:**
- Topbar (48px fixed height): Azurdle logo + brand name on left; Archive, Stats, Help buttons in center; Sign out on right
- Main header in content area: Title "Azurdle #X ServiceName" with category subtitle
- Session timer (HH:MM:SS format) displayed right-aligned in title row

**Game Area (two-column):**
- **Left column (55%):** Clue list + guess input bar
  - Scrollable clue list with numbered pills (1-5) in primary blue badges
  - Clues fade in as guesses reveal them (staggered ladder effect)
  - Dashed pipeline connectors between clues (visual dependency chain)
  - Input bar at bottom: autocomplete input + submit button (always visible, pinned)
  - Shake animation on wrong guesses (horizontal jitter, not red flash — misses are information)
  
- **Right column (45%):** Cloud Log (guesses history)
  - "Cloud Log" header with history icon + "LIVE FEED" badge
  - Scrollable list of guesses with badges/metadata
  - Each guess shows:
    - Service name in pill (red X icon for wrong guesses, no icon for correct)
    - Attribute grid below showing: category badge, launch year, model type (PaaS/IaaS/SaaS), pricing tier
  - Animates in as guesses are submitted (same reveal animation as clues)

**Result Section (game over only):**
- Result banner (green for win, subtle for loss) with result text
- Success message: "Solved on clue N! The answer was X."
- Failure message: "Out of guesses. The answer was X."
- Share button (copy to clipboard) below results
- Countdown timer to next puzzle

### Colors & Styling

- **Primary:** Microsoft Azure Blue for interactive elements (button, badges, focus states)
- **Accents:** Green wash background for win state, muted grays for neutral states
- **Icons:** X for wrong guesses (muted color), checkmark appearance for correct
- **Badges:** Category tags (COMPUTE, STORAGE, etc.), year badges, model type tags
- **Animations:**
  - Clue reveal: fade + slide up (260ms)
  - Miss highlight: border pulse on newly-revealed clue (900ms)
  - Input shake: horizontal jitter on wrong guess (320ms)
  - Result banner: reveal from bottom (220ms)

### Typography & Spacing

- Title: Geist Sans, 16px bold (puzzle #X and category)
- Monospace: Geist Mono for clue numbers, timer, guesses list (code-like precision)
- Standard body: Geist Sans, 15px for clue text
- Metadata/labels: 11-13px uppercase with letter spacing for Cloud Log headers
- Spacing: 12px gaps (var(--space-sm)), 16px paragraph spacing (var(--space-md))

### Responsive Design

- **Desktop (>680px):** Two-column layout with right panel at 45% width
- **Mobile (<680px):** Stacked vertical layout, right panel becomes row 2
- Topbar always visible at top
- Game area scrolls internally (pinned guess input on desktop, adapts on mobile)

## Frontend conventions

- Keep the bundle small. Game state machine: clue reveal → guess → result → share.
- Share text is the growth loop and must be spoiler-free:
  `Azurdle #47 — solved on clue 2` plus a filled/empty square row. Built from puzzle
  number and clue count only — never the answer or clue text.
- localStorage: one versioned key (e.g. `azurdle.v1`) holding guess history and UI state
  per puzzle date. Never store anything answer-adjacent. Shape must map cleanly onto the
  `attempts` row for `/api/migrate`.
- Accessible by default: fully playable by keyboard; clue reveals announced via aria-live.
- **Cloud Log:** Displays the history of player guesses with service metadata (category, year, model type, pricing).
  - Wrong guesses show red X icon and remain visible for reference
  - Correct guess (final answer on game end) shows without icon
  - Attribute grid beneath each guess displays service characteristics for learning
  - Updates in real-time as new guesses come in (animates into list)
  - Sticky header with "LIVE FEED" badge at top

## Free-tier guardrails (do not violate)

- Vercel Hobby only. If a feature would require Pro, say so before building it.
- Supabase free tier: watch the project-pause-on-inactivity policy. A scheduled ping
  (GitHub Actions cron hitting a health endpoint) keeps it awake pre-launch.
- GitHub Models free tier is rate-limited: batch generation, backoff on 429s.
- No paid dependencies, no services requiring a credit card.

## Commands

```bash
npm run dev               # next dev
npm run build             # must pass with zero puzzle data in client chunks
npm run test              # guess normalization, clue gating, and RLS assumptions first
npm run lint
npm run generate:puzzle   # generate puzzle for today+14, writes to Supabase as queued (no human gate)
npm run validate:content  # schema + duplicate-window checks against Supabase puzzle rows
npm run calibrate         # standalone re-check: difficulty + fact/structure calibration via GitHub Models
npm run check:queue       # warn if queued buffer < 7 days or reserves < 5
```

### Service Attributes & Cloud Log Metadata

Each guessed service displays an attribute grid below its name showing:
- **Category:** Colored badge (COMPUTE, STORAGE, NETWORKING, etc.)
- **Launch Year:** Badge showing year service was released (e.g., "2015", "2020+")
- **Model Type:** Pricing/delivery model badge (IaaS, PaaS, SaaS, Free)
- **Pricing Structure:** Per-unit cost model (PER HOUR, PER MONTH, FREE, etc.)

These attributes help players learn service distinctions while guessing and provide context for why their guess was wrong (does the answer share category with their guess? Model type? Pricing tier?).

Attributes are sourced from `services-metadata.json` (enriched service vocabulary) and piped through `POST /api/guess` response as `attributeComparison` data.

## Things Claude should NOT do

- Never log or return the answer, unrevealed clues, or the service-role key.
- Never move validation logic client-side "for responsiveness."
- Never query the `puzzles` table from client code, and never weaken its RLS.
- Never put the service-role key or the GitHub Models PAT in `NEXT_PUBLIC_*` vars or
  commit `.env*` files.
- Never commit puzzle content (answers, clues) to git in any form — this repo is public;
  generation writes straight to Supabase as `queued`.
- Never weaken `passesCalibration()` without deliberate intent — there is no human
  review step behind it. It is the only thing standing between a bad AI-generated
  puzzle and every player seeing it.
- Never generate the puzzle for today/tomorrow — always today+14 (the buffer is the
  safety net; do not bypass it).
- Never call GitHub Models from runtime request paths.
- Never change the UTC rollover or puzzle numbering scheme — both are contracts with
  players' streaks and share texts.
- Never add a paid dependency or plan upgrade without flagging it.
- **Design:** Do not strip out the two-column layout, Cloud Log, or attribute grids without clear reason — these are the core learning loop. Do not use red/amber for misses (they are information, not errors; stick to muted tones). Do not hide the session timer or make sharing harder (both are growth vectors).
