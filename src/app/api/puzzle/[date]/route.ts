import { NextResponse } from "next/server";
import { getPuzzleForDate } from "@/lib/puzzles";
import { isFutureDate } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { getAttempt } from "@/lib/attempts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  if (isFutureDate(date)) {
    return NextResponse.json({ error: "puzzle not available yet" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const puzzle = await getPuzzleForDate(date);
  if (!puzzle) {
    return NextResponse.json({ error: "puzzle not found" }, { status: 404 });
  }

  const attempt = await getAttempt(supabase, userData.user.id, date);
  const cluesRevealed = attempt?.clues_revealed ?? 1;

  return NextResponse.json({
    date: puzzle.date,
    number: puzzle.number,
    category: puzzle.category,
    clues: puzzle.clues.slice(0, cluesRevealed),
    guesses: attempt?.guesses ?? [],
    solved: attempt?.solved ?? false,
  });
}
