import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  // Today's date in UTC
  const today = new Date().toISOString().slice(0, 10);

  const admin = createAdminClient();

  // Get all completed attempts for today's puzzle
  const { data: rows, error } = await admin
    .from("attempts")
    .select("solved, clues_revealed")
    .eq("puzzle_date", today)
    .not("completed_at", "is", null);

  if (error) throw error;

  const attempts = rows ?? [];
  const totalPlayed = attempts.length;
  const totalSolved = attempts.filter((r) => r.solved).length;
  const solveRate = totalPlayed > 0 ? Math.round((totalSolved / totalPlayed) * 100) : 0;

  const solveDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of attempts) {
    if (row.solved) {
      solveDistribution[row.clues_revealed] = (solveDistribution[row.clues_revealed] ?? 0) + 1;
    }
  }

  // If the user is signed in and has played today, include their clue number
  // so the modal can highlight their bar in the distribution.
  let myCluesRevealed: number | null = null;
  let mySolved: boolean | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: mine } = await admin
        .from("attempts")
        .select("solved, clues_revealed")
        .eq("user_id", user.id)
        .eq("puzzle_date", today)
        .maybeSingle();
      if (mine) {
        myCluesRevealed = mine.clues_revealed;
        mySolved = mine.solved;
      }
    }
  } catch {
    // Non-fatal — community stats still return
  }

  return NextResponse.json({
    date: today,
    totalPlayed,
    totalSolved,
    solveRate,
    solveDistribution,
    myCluesRevealed,
    mySolved,
  });
}
