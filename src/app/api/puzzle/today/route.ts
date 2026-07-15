import { NextResponse } from "next/server";
import { getTodayPuzzle } from "@/lib/today-puzzle";
import { createClient } from "@/lib/supabase/server";
import { getAttempt } from "@/lib/attempts";

export async function GET() {
  const puzzle = await getTodayPuzzle();

  if (!puzzle) {
    // Should be unreachable — the reserve pool is the last-resort fallback.
    // If this fires, alerting on the queue/reserve check has already failed.
    return NextResponse.json({ error: "no puzzle available" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  let cluesRevealed = 1;
  let guesses: string[] = [];
  let solved = false;

  if (userData.user) {
    const attempt = await getAttempt(supabase, userData.user.id, puzzle.date);
    if (attempt) {
      cluesRevealed = attempt.clues_revealed;
      guesses = attempt.guesses;
      solved = attempt.solved;
    }
  }

  return NextResponse.json({
    date: puzzle.date,
    number: puzzle.number,
    category: puzzle.category,
    clues: puzzle.clues.slice(0, cluesRevealed),
    guesses,
    solved,
  });
}
