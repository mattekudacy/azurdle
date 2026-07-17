import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { getPuzzleForDate } from "@/lib/puzzles";
import { isCorrectGuess, normalizeGuess } from "@/lib/guess";
import { isFutureDate } from "@/lib/date";
import { isRateLimited } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getAttempt, upsertAttempt } from "@/lib/attempts";
import {
  COOKIE_NAME,
  parseAnonProgress,
  serializeAnonProgress,
} from "@/lib/anon-progress";
import type { ServiceEntry } from "@/lib/service-entry";
import { compareAttributes } from "@/lib/attribute-comparison";

const MAX_GUESSES = 5;
const TOTAL_CLUES = 5;

// Built once per cold start — O(1) lookups for attribute comparisons.
function loadServiceMap(): Map<string, ServiceEntry> {
  const raw = readFileSync(
    join(process.cwd(), "public", "vocab", "services.json"),
    "utf-8",
  );
  const entries: ServiceEntry[] = JSON.parse(raw);
  const map = new Map<string, ServiceEntry>();
  for (const entry of entries) {
    map.set(normalizeGuess(entry.name), entry);
  }
  return map;
}

const serviceMap: Map<string, ServiceEntry> = loadServiceMap();

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guess: z.string().min(1).max(200),
  elapsedSeconds: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = (headersList.get("x-forwarded-for") ?? "").split(",").at(-1)?.trim() || "unknown";
  if (await isRateLimited(ip)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const { date, guess, elapsedSeconds } = parsed.data;

  if (isFutureDate(date)) {
    return NextResponse.json({ error: "puzzle not available yet" }, { status: 400 });
  }

  const puzzle = await getPuzzleForDate(date);
  if (!puzzle) {
    return NextResponse.json({ error: "puzzle not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  let cluesRevealed = 1;
  let priorGuesses: string[] = [];
  let solved = false;

  if (userData.user) {
    const attempt = await getAttempt(supabase, userData.user.id, date);
    if (attempt) {
      cluesRevealed = attempt.clues_revealed;
      priorGuesses = attempt.guesses;
      solved = attempt.solved;
    }
  } else {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    const anonProgress = raw ? parseAnonProgress(raw) : null;

    if (anonProgress && anonProgress.date === date) {
      cluesRevealed = anonProgress.cluesRevealed;
      priorGuesses = anonProgress.guesses;
    }
    // No valid cookie for this date → fresh start (cluesRevealed=1, priorGuesses=[])
  }

  if (solved) {
    return NextResponse.json({ error: "puzzle already solved" }, { status: 400 });
  }

  const correct = isCorrectGuess(guess, puzzle.answer, puzzle.aliases);
  const guesses = [...priorGuesses, guess];
  const gameOver = correct || guesses.length >= MAX_GUESSES;
  const nextCluesRevealed = correct
    ? cluesRevealed
    : Math.min(cluesRevealed + 1, TOTAL_CLUES);

  if (userData.user) {
    await upsertAttempt(supabase, {
      user_id: userData.user.id,
      puzzle_date: date,
      guesses,
      clues_revealed: nextCluesRevealed,
      solved: correct,
      completed_at: gameOver ? new Date().toISOString() : null,
      elapsed_seconds: gameOver && elapsedSeconds != null ? elapsedSeconds : null,
    });
  }

  // Include attribute comparison for wrong guesses that haven't ended the game,
  // but only when both the guessed service and the answer are in the vocab.
  let attributeComparison = undefined;
  if (!correct && !gameOver) {
    const guessEntry = serviceMap.get(normalizeGuess(guess));
    const answerEntry = serviceMap.get(normalizeGuess(puzzle.answer));
    if (guessEntry && answerEntry) {
      attributeComparison = compareAttributes(guessEntry, answerEntry);
    }
  }

  const response = NextResponse.json({
    correct,
    gameOver,
    nextClue: !correct && !gameOver ? puzzle.clues[nextCluesRevealed - 1] : undefined,
    answer: gameOver ? puzzle.answer : undefined,
    // Safe to send the full ladder once the game is over — the answer
    // itself is already revealed at that point, so this isn't a new leak.
    allClues: gameOver ? puzzle.clues : undefined,
    attributeComparison,
  });

  if (!userData.user) {
    response.cookies.set(COOKIE_NAME, serializeAnonProgress({
      date,
      guesses,
      cluesRevealed: nextCluesRevealed,
    }), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // Expire at end of day + 1h buffer (UTC midnight + 1h).
      // The cookie is date-scoped anyway, but this keeps browser storage clean.
      maxAge: 25 * 60 * 60,
    });
  }

  return response;
}
