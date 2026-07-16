import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { chatText, MODEL } from "./lib/model-provider";
import { parseJsonResponse } from "./lib/json";
import { calibrate } from "./lib/calibration";
import { puzzleSchema, type Puzzle } from "../src/lib/puzzle-schema";
import { normalizeGuess } from "../src/lib/guess";

const MAX_REGENERATION_ATTEMPTS = 3;
const EXCLUSION_WINDOW_DAYS = 90;
const BUFFER_OFFSET_DAYS = 14;

// The autocomplete vocabulary (public/vocab/services.json) is the actual
// list of services players can search/select — it's also the real,
// up-to-date candidate pool for puzzle answers. Without this, the
// drafting model only ever proposes services it already "knows" well
// enough to think of unprompted, so newly-added entries (e.g. Microsoft
// Foundry) never surface as answers even though players can guess them.
function loadServiceVocab(): string[] {
  const path = join(__dirname, "..", "public", "vocab", "services.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

const CLUE_LADDER_SPEC = `
Every puzzle has exactly 5 clues following this ladder, each roughly halving the
candidate set (clue 1 fits ~15 services, clue 5 fits exactly 1):
1. The problem, with one fingerprint — plain business language, no Azure jargon,
   but with one distinctive detail giving an expert a genuine (~30-40%) shot, NOT
   a near-certain one. This is the clue most puzzles get wrong: it must stay
   AMBIGUOUS across roughly 15 plausible Azure services, not point at just one.
   Before finalizing clue 1, silently list ~15 Azure services that could plausibly
   fit it. If you can't name that many, the clue is too specific — broaden it by
   removing the detail that narrows it down (a unique feature name, an exact
   integration, a distinguishing constraint) and keep only the general shape of
   the problem. Do not include any term, abbreviation, or feature name that is
   unique to the answer service — save that specificity for clues 2-5.
2. The constraint that eliminates half the candidates. Still describes a
   SHORTLIST (multiple plausible services), not the one answer alone.
3. The architecture behavior — narrows to a category or 2-3 sibling services.
   This is the OTHER clue most puzzles get wrong: a distinctive-sounding
   architectural detail (e.g. "topics and subscriptions", "consumer groups",
   "multi-model in one account") is very often unique to exactly one Azure
   service even though it sounds like it merely describes a category. Before
   finalizing clue 3, silently check whether the detail you used is ALSO true
   of at least one other real Azure service. If it isn't — if only the answer
   service has that specific feature/vocabulary — the clue has jumped straight
   to full uniqueness and must be rewritten to describe the broader behavior
   pattern (e.g. "a managed pub/sub messaging system" rather than the specific
   named construct "topics and subscriptions") instead of the feature name.
4. The telltale term of art — vocabulary only this service (and maybe one close
   confuser) uses. By design this narrows FURTHER than clue 3, but should still
   leave 2-3 candidates standing (the answer plus its closest confuser(s)), not
   zero. If clue 4's term is so specific that literally only the answer service
   has it, that's clue 5's job, not clue 4's — pull the giveaway back to clue 5
   and use a softer, still-narrowing-but-shared term for clue 4.
5. The giveaway — AWS equivalent, abbreviation, or unique product fact. This is
   the ONLY clue allowed to single out exactly one service. If clues 2-4 already
   did that, the ladder is broken even if clue 5 itself is fine.
Avoid clues that go stale: no exact prices, no tier names Microsoft shuffles often.
`.trim();

// Writes straight to Supabase as `queued` — never to a git file, and never
// through a human review step. Puzzle content (answers, including up to 14
// days of unplayed future puzzles) must never touch git in a repo that may
// go public. There is no human gate: calibrate() (shortlistability and
// fact/structure correctness) is the entire review. See CLAUDE.md for the
// full rationale, including why the clue-1 auto-solvability check that
// used to live here was removed.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * The buffer target is today+14, but if a run already filled that date
 * (e.g. the buffer got ahead, or a day was seeded out of order), `date` is
 * the primary key — inserting a duplicate would crash instead of gracefully
 * shrinking the buffer. Target = max(today+14, latest existing date + 1),
 * so generation always extends the buffer forward from wherever it ends.
 */
async function targetDate(supabase: ReturnType<typeof getAdminClient>): Promise<string> {
  const { data, error } = await supabase
    .from("puzzles")
    .select("date")
    .not("date", "is", null)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const minTarget = new Date();
  minTarget.setUTCDate(minTarget.getUTCDate() + BUFFER_OFFSET_DAYS);

  if (!data?.date) return minTarget.toISOString().slice(0, 10);

  const dayAfterLatest = new Date(data.date);
  dayAfterLatest.setUTCDate(dayAfterLatest.getUTCDate() + 1);

  const target = dayAfterLatest > minTarget ? dayAfterLatest : minTarget;
  return target.toISOString().slice(0, 10);
}

/**
 * Answers to exclude from a fresh draft: dated puzzles within the rolling
 * window, PLUS every reserve puzzle regardless of date. Reserve rows have
 * `date: null` — a naive `.gte("date", cutoff)` filter silently excludes
 * them all (Postgres: `null >= anything` is never true), which let two
 * "Azure Event Grid" reserve puzzles get generated back to back before
 * this was caught. Reserve puzzles never expire out of relevance the way
 * dated ones do (there's no "90 days ago" for a puzzle with no date), so
 * they're excluded unconditionally, not just within the window.
 */
async function recentAnswers(supabase: ReturnType<typeof getAdminClient>): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - EXCLUSION_WINDOW_DAYS);

  const [{ data: dated, error: datedError }, { data: reserve, error: reserveError }] = await Promise.all([
    supabase.from("puzzles").select("answer").gte("date", cutoff.toISOString().slice(0, 10)),
    supabase.from("puzzles").select("answer").eq("status", "reserve"),
  ]);

  if (datedError) throw datedError;
  if (reserveError) throw reserveError;
  return [...(dated ?? []), ...(reserve ?? [])].map((row) => row.answer as string);
}

async function nextPuzzleNumber(supabase: ReturnType<typeof getAdminClient>): Promise<number> {
  // Excludes reserve rows (number: null) explicitly — Postgres sorts NULLs
  // first in a DESC order by default, so without this filter the "max"
  // query can return a reserve row's null instead of the true highest
  // number, making every computed nextNumber wrong.
  const { data, error } = await supabase
    .from("puzzles")
    .select("number")
    .not("number", "is", null)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.number ?? 0) + 1;
}

async function draftPuzzle(
  eligibleAnswers: string[],
  slot: { date: string; number: number } | { status: "reserve" },
): Promise<Puzzle> {
  const content = await chatText(
    MODEL,
    [
      {
        role: "system",
        content:
          "You write puzzles for Azurdle, a daily Azure-service guessing game. " +
          "Respond with ONLY a JSON object matching this shape: " +
          '{"answer": string, "aliases": string[], "clues": string[5], "category": string, "difficulty": "easy"|"medium"|"hard"}',
      },
      {
        role: "user",
        content:
          `${CLUE_LADDER_SPEC}\n\nThe "answer" MUST be exactly one of the services in this list — copy the ` +
          "spelling exactly, do not invent a service or use a different name/abbreviation for the answer " +
          `field (aliases are still fine for alternate names players might type):\n${eligibleAnswers.join(", ")}`,
      },
    ],
    { json: true },
  );

  const draft = parseJsonResponse<Record<string, unknown>>(content);
  return "status" in slot
    ? puzzleSchema.parse({ ...draft, status: "reserve" })
    : puzzleSchema.parse({ ...draft, date: slot.date, number: slot.number, status: "queued" });
}

/**
 * Generates one puzzle and inserts it. `queued` mode (default) targets the
 * buffer date; `reserve` mode generates an evergreen, date-less fallback —
 * see CLAUDE.md on why the reserve pool exists and how it's replenished.
 */
async function generateOne(mode: "queued" | "reserve") {
  const supabase = getAdminClient();
  const excludedAnswers = await recentAnswers(supabase);
  const excludedSet = new Set(excludedAnswers.map(normalizeGuess));

  const vocab = loadServiceVocab();
  const eligibleAnswers = vocab.filter((service) => !excludedSet.has(normalizeGuess(service)));
  if (eligibleAnswers.length === 0) {
    // Every service in the vocab was used in the last 90 days (or is
    // already a reserve puzzle) — should be unreachable at ~70 services
    // and 1 puzzle/day, but fail loudly rather than draft from an empty
    // candidate list.
    throw new Error("No eligible answers left — every vocab service is within the exclusion window");
  }

  const slot =
    mode === "reserve"
      ? ({ status: "reserve" } as const)
      : { date: await targetDate(supabase), number: await nextPuzzleNumber(supabase) };
  const label = "status" in slot ? "reserve puzzle" : `puzzle for ${slot.date}`;

  for (let attempt = 1; attempt <= MAX_REGENERATION_ATTEMPTS; attempt++) {
    console.log(`Generating ${label} (attempt ${attempt}/${MAX_REGENERATION_ATTEMPTS})`);
    const puzzle = await draftPuzzle(eligibleAnswers, slot);

    const normalizedAnswer = normalizeGuess(puzzle.answer);
    const matchedVocabEntry = eligibleAnswers.find(
      (service) => normalizeGuess(service) === normalizedAnswer,
    );
    if (!matchedVocabEntry) {
      console.log(`Answer "${puzzle.answer}" is not in the eligible vocab list, regenerating`);
      continue;
    }
    // Snap to the vocab's exact spelling even on a near-match (different
    // casing/whitespace) — keeps the stored answer consistent with what
    // autocomplete actually offers players.
    puzzle.answer = matchedVocabEntry;

    const result = await calibrate(puzzle);
    if (!result.passed) continue;

    const { error } = await supabase.from("puzzles").insert(puzzle);
    if (error) throw error;
    console.log(`Inserted ${puzzle.status} puzzle (${puzzle.answer})`);
    return;
  }

  // A failed run just shrinks the buffer by one day (or skips one reserve
  // slot) — the next run catches up. Never breaks the live game.
  console.error(`Failed to generate ${label} after ${MAX_REGENERATION_ATTEMPTS} attempts`);
  process.exit(1);
}

const mode = process.argv.includes("--reserve") ? "reserve" : "queued";
generateOne(mode).catch((err) => {
  console.error("Unexpected error during generation:", err);
  process.exit(1);
});
