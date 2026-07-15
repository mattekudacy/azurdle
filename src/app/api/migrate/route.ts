import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAttempt, upsertAttempt } from "@/lib/attempts";

const localAttemptSchema = z.object({
  puzzleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guesses: z.array(z.string()),
  cluesRevealed: z.number().int().min(1).max(5),
  solved: z.boolean(),
  completedAt: z.string().nullable(),
});

const bodySchema = z.object({
  attempts: z.array(localAttemptSchema),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  for (const local of parsed.data.attempts) {
    // Never let a stale local attempt overwrite a further-progressed server
    // record — only merge in, never regress.
    const existing = await getAttempt(supabase, userData.user.id, local.puzzleDate);
    if (existing && existing.clues_revealed >= local.cluesRevealed && !local.solved) {
      continue;
    }

    await upsertAttempt(supabase, {
      user_id: userData.user.id,
      puzzle_date: local.puzzleDate,
      guesses: local.guesses,
      clues_revealed: local.cluesRevealed,
      solved: local.solved,
      completed_at: local.completedAt,
    });
  }

  return NextResponse.json({ migrated: parsed.data.attempts.length });
}
