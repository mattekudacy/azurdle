import "server-only";
import { todayUtc } from "@/lib/date";
import { getPuzzleForDate, serveReservePuzzleForDate } from "@/lib/puzzles";

/**
 * Resolves today's live puzzle, falling back to a reserve puzzle if the
 * queued buffer is empty. Per CLAUDE.md this fallback must never surface as
 * "no puzzle today" — only ever "a reserve puzzle ran".
 */
export async function getTodayPuzzle() {
  const date = todayUtc();
  const puzzle = await getPuzzleForDate(date);
  if (puzzle) return puzzle;

  return serveReservePuzzleForDate(date);
}
