import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  cluesRevealed: number;
  elapsedSeconds: number | null;
  totalSolved: number;
};

function formatName(meta: Record<string, string> | null, email: string | null): string {
  if (meta?.user_name) return meta.user_name;
  if (meta?.full_name) return meta.full_name;
  if (email) return email.split("@")[0];
  return "Player";
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();

  // Today's completed solves — only players who solved it
  const { data: todayRows, error: todayError } = await admin
    .from("attempts")
    .select("user_id, clues_revealed, elapsed_seconds")
    .eq("puzzle_date", today)
    .eq("solved", true)
    .not("completed_at", "is", null)
    .order("clues_revealed", { ascending: true })
    .order("elapsed_seconds", { ascending: true, nullsFirst: false });

  if (todayError) throw todayError;

  const solvers = todayRows ?? [];

  // Total puzzles solved per user (all time) — just the solver IDs we need
  const userIds = solvers.map((r) => r.user_id);

  let totalSolvedByUser: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: allTime } = await admin
      .from("attempts")
      .select("user_id")
      .in("user_id", userIds)
      .eq("solved", true);

    for (const row of allTime ?? []) {
      totalSolvedByUser[row.user_id] = (totalSolvedByUser[row.user_id] ?? 0) + 1;
    }
  }

  // Fetch display names via admin auth API — batched to the solver IDs only
  const userMeta: Record<string, { displayName: string }> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersData?.users ?? []) {
      if (userIds.includes(u.id)) {
        userMeta[u.id] = {
          displayName: formatName(
            u.user_metadata as Record<string, string> | null,
            u.email ?? null,
          ),
        };
      }
    }
  }

  const leaderboard: LeaderboardEntry[] = solvers.map((row) => ({
    userId: row.user_id,
    displayName: userMeta[row.user_id]?.displayName ?? "Player",
    cluesRevealed: row.clues_revealed,
    elapsedSeconds: row.elapsed_seconds ?? null,
    totalSolved: totalSolvedByUser[row.user_id] ?? 1,
  }));

  // Community totals
  const { data: allToday } = await admin
    .from("attempts")
    .select("solved")
    .eq("puzzle_date", today)
    .not("completed_at", "is", null);

  const totalPlayed = allToday?.length ?? 0;
  const totalSolved = allToday?.filter((r) => r.solved).length ?? 0;
  const solveRate = totalPlayed > 0 ? Math.round((totalSolved / totalPlayed) * 100) : 0;

  // Solve distribution
  const { data: distRows } = await admin
    .from("attempts")
    .select("clues_revealed")
    .eq("puzzle_date", today)
    .eq("solved", true);

  const solveDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distRows ?? []) {
    solveDistribution[row.clues_revealed] = (solveDistribution[row.clues_revealed] ?? 0) + 1;
  }

  // Current user's result for highlighting
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
    // Non-fatal
  }

  return NextResponse.json({
    date: today,
    totalPlayed,
    totalSolved,
    solveRate,
    solveDistribution,
    leaderboard,
    myCluesRevealed,
    mySolved,
  });
}
