import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getPuzzleForDate } from "@/lib/puzzles";
import { isCorrectGuess } from "@/lib/guess";
import { isFutureDate } from "@/lib/date";
import { isRateLimited } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getAttempt, upsertAttempt } from "@/lib/attempts";

const MAX_GUESSES = 5;
const TOTAL_CLUES = 5;

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guess: z.string().min(1).max(200),
  // Anonymous play has no server-side session, so the client (localStorage)
  // reports its own progress. Signed-in progress is authoritative from the
  // `attempts` table instead and this is ignored.
  priorGuesses: z.array(z.string()).max(5).default([]),
});

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const { date, guess, priorGuesses: clientPriorGuesses } = parsed.data;

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
  let priorGuesses: string[] = clientPriorGuesses;
  let solved = false;

  if (userData.user) {
    const attempt = await getAttempt(supabase, userData.user.id, date);
    if (attempt) {
      cluesRevealed = attempt.clues_revealed;
      priorGuesses = attempt.guesses;
      solved = attempt.solved;
    }
  } else {
    cluesRevealed = Math.min(priorGuesses.length + 1, TOTAL_CLUES);
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
    });
  }

  return NextResponse.json({
    correct,
    gameOver,
    nextClue: !correct && !gameOver ? puzzle.clues[nextCluesRevealed - 1] : undefined,
    answer: gameOver ? puzzle.answer : undefined,
    // Safe to send the full ladder once the game is over — the answer
    // itself is already revealed at that point, so this isn't a new leak.
    allClues: gameOver ? puzzle.clues : undefined,
  });
}
