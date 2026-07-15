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
    .select("id, date, number, answer, aliases, clues, category, difficulty, status")
    .eq("status", "reserve")
    .limit(1)
    .maybeSingle();

  if (reserveError) throw reserveError;
  if (!reserve) return null;

  // Excludes reserve rows (number: null) explicitly — Postgres sorts NULLs
  // first in a DESC order by default, so without this filter the "max"
  // query returns a reserve row's null instead of the true highest number,
  // making every computed nextNumber wrong (found via the same production
  // bug as the .eq("id", ...) fix above).
  const { data: maxRow, error: maxError } = await supabase
    .from("puzzles")
    .select("number")
    .not("number", "is", null)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) throw maxError;
  const nextNumber = (maxRow?.number ?? 0) + 1;

  // Match on id (see migration 0005) — reserve.date/number are null by
  // design, and matching on them directly is both invalid (`.eq` against
  // null sends the literal string "null", which Postgres rejects for a
  // date column) and unsafe even if it worked (nothing else uniquely
  // identifies a single reserve row).
  const { data: updated, error: updateError } = await supabase
    .from("puzzles")
    .update({ date, number: nextNumber, status: "live" })
    .eq("id", reserve.id)
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
