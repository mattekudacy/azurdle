import type { SupabaseClient } from "@supabase/supabase-js";

export type Attempt = {
  user_id: string;
  puzzle_date: string;
  guesses: string[];
  clues_revealed: number;
  solved: boolean;
  completed_at: string | null;
};

/** Client-scoped (RLS: user_id = auth.uid()) — safe to call with the
 * request-bound Supabase client, never the admin client. */
export async function getAttempt(
  supabase: SupabaseClient,
  userId: string,
  puzzleDate: string,
): Promise<Attempt | null> {
  const { data, error } = await supabase
    .from("attempts")
    .select("user_id, puzzle_date, guesses, clues_revealed, solved, completed_at")
    .eq("user_id", userId)
    .eq("puzzle_date", puzzleDate)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertAttempt(
  supabase: SupabaseClient,
  attempt: Attempt,
): Promise<void> {
  const { error } = await supabase.from("attempts").upsert(attempt, {
    onConflict: "user_id,puzzle_date",
  });
  if (error) throw error;
}
