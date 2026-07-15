import { NextResponse } from "next/server";
import { todayUtc } from "@/lib/date";
import { getArchivePuzzles } from "@/lib/puzzles";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const puzzles = await getArchivePuzzles(todayUtc());

  const { data: attempts, error } = await supabase
    .from("attempts")
    .select("puzzle_date, solved, clues_revealed")
    .eq("user_id", userData.user.id);
  if (error) throw error;

  const attemptsByDate = new Map(attempts?.map((a) => [a.puzzle_date, a]));

  return NextResponse.json({
    puzzles: puzzles.map((puzzle) => ({
      date: puzzle.date,
      number: puzzle.number,
      category: puzzle.category,
      completion: attemptsByDate.get(puzzle.date) ?? null,
    })),
  });
}
