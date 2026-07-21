import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AllTimeEntry = {
  userId: string;
  displayName: string;
  totalSolved: number;
  avgClues: number;
};

function formatName(meta: Record<string, string> | null, email: string | null): string {
  if (meta?.user_name) return meta.user_name;
  if (meta?.full_name) return meta.full_name;
  if (email) return email.split("@")[0];
  return "Player";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // All-time leaderboard: rank all users by total solved → avg clues
  const { data: allAttempts } = await admin
    .from("attempts")
    .select("user_id, clues_revealed")
    .eq("solved", true)
    .not("completed_at", "is", null);

  const byUser: Record<string, { total: number; cluesSum: number }> = {};
  for (const row of allAttempts ?? []) {
    if (!byUser[row.user_id]) byUser[row.user_id] = { total: 0, cluesSum: 0 };
    byUser[row.user_id].total += 1;
    byUser[row.user_id].cluesSum += row.clues_revealed;
  }

  const rankedIds = Object.entries(byUser)
    .sort(([, a], [, b]) => {
      if (b.total !== a.total) return b.total - a.total;
      return (a.cluesSum / a.total) - (b.cluesSum / b.total);
    })
    .slice(0, 20)
    .map(([id]) => id);

  const userMeta: Record<string, { displayName: string }> = {};
  if (rankedIds.length > 0) {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersData?.users ?? []) {
      if (rankedIds.includes(u.id)) {
        userMeta[u.id] = {
          displayName: formatName(
            u.user_metadata as Record<string, string> | null,
            u.email ?? null,
          ),
        };
      }
    }
  }

  const allTimeLeaderboard: AllTimeEntry[] = rankedIds.map((id) => ({
    userId: id,
    displayName: userMeta[id]?.displayName ?? "Player",
    totalSolved: byUser[id].total,
    avgClues: Math.round((byUser[id].cluesSum / byUser[id].total) * 10) / 10,
  }));

  // Personal stats — only if signed in
  let myStats: {
    totalSolved: number;
    currentStreak: number;
    bestStreak: number;
    avgClues: number;
    solveDistribution: Record<number, number>;
  } | null = null;

  if (user) {
    const { data: myAttempts } = await admin
      .from("attempts")
      .select("puzzle_date, solved, clues_revealed")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("puzzle_date", { ascending: true });

    const rows = myAttempts ?? [];
    const totalSolved = rows.filter((r) => r.solved).length;

    const solveDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let cluesSum = 0;
    for (const r of rows.filter((r) => r.solved)) {
      solveDistribution[r.clues_revealed] = (solveDistribution[r.clues_revealed] ?? 0) + 1;
      cluesSum += r.clues_revealed;
    }
    const avgClues = totalSolved > 0
      ? Math.round((cluesSum / totalSolved) * 10) / 10
      : 0;

    // Streak: consecutive solved days ending at (or before) today
    const today = new Date().toISOString().slice(0, 10);
    const solvedDates = new Set(rows.filter((r) => r.solved).map((r) => r.puzzle_date));

    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 0;
    let prev: string | null = null;

    // Walk forward through all completed dates (solved or not)
    const allDates = rows.map((r) => r.puzzle_date).sort();
    for (const date of allDates) {
      if (solvedDates.has(date)) {
        if (prev === null) {
          streak = 1;
        } else {
          const d1 = new Date(prev);
          const d2 = new Date(date);
          const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000);
          streak = diffDays === 1 ? streak + 1 : 1;
        }
        prev = date;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
        prev = date;
      }
    }

    // currentStreak only counts if the streak reaches today or yesterday
    // (missing today is fine if they haven't played yet)
    const yesterday = new Date(new Date(today).getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
    const streakIsActive = prev === today || prev === yesterday;
    currentStreak = streakIsActive ? streak : 0;

    myStats = { totalSolved, currentStreak, bestStreak, avgClues, solveDistribution };
  }

  return NextResponse.json({ allTimeLeaderboard, myStats });
}
