import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Puzzle } from "@/lib/puzzle-schema";

type PuzzleRow = {
  date: string;
  number: number;
  answer: string;
  aliases: string[];
  clues: string[];
  category: string;
  difficulty: Puzzle["difficulty"];
  status: string;
};

/** Server-only reads against `puzzles`. Never call from client code — see
 * CLAUDE.md "Critical security rule: the answer never leaves the server".
 *
 * Filters to queued/live only, excluding any other status (e.g. `retired`)
 * that might otherwise share a date. */
export async function getPuzzleForDate(date: string): Promise<PuzzleRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("puzzles")
    .select("date, number, answer, aliases, clues, category, difficulty, status")
    .eq("date", date)
    .in("status", ["queued", "live"])
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Reserve fallback: picks the next unused evergreen puzzle and promotes it
 * to `live` for `date`, assigning the next puzzle number. This is the "the
 * failure mode must always be a reserve puzzle ran" guarantee from CLAUDE.md.
 */
export async function serveReservePuzzleForDate(date: string): Promise<PuzzleRow | null> {
  const supabase = createAdminClient();

  const { data: reserve, error: reserveError } = await supabase
    .from("puzzles")
    .select("date, number, answer, aliases, clues, category, difficulty, status")
    .eq("status", "reserve")
    .limit(1)
    .maybeSingle();

  if (reserveError) throw reserveError;
  if (!reserve) return null;

  const { data: maxRow, error: maxError } = await supabase
    .from("puzzles")
    .select("number")
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) throw maxError;
  const nextNumber = (maxRow?.number ?? 0) + 1;

  const { data: updated, error: updateError } = await supabase
    .from("puzzles")
    .update({ date, number: nextNumber, status: "live" })
    .eq("date", reserve.date)
    .eq("number", reserve.number)
    .select("date, number, answer, aliases, clues, category, difficulty, status")
    .single();

  if (updateError) throw updateError;
  return updated;
}

export async function getArchivePuzzles(beforeDate: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("puzzles")
    .select("date, number, category")
    .lt("date", beforeDate)
    .in("status", ["retired", "live"])
    .order("date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
