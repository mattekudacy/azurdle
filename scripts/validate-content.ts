import { createClient } from "@supabase/supabase-js";
import { puzzleSchema } from "../src/lib/puzzle-schema";
import { normalizeGuess } from "../src/lib/guess";

const DUPLICATE_WINDOW_DAYS = 90;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * Re-validates every row in `puzzles` against the schema and checks for
 * duplicate answers within the rolling window. generate-puzzles.ts already
 * validates a puzzle before inserting it, so this is a standalone health
 * check — run it periodically or by hand, independent of generation, to
 * catch drift (e.g. a manually-edited row in the Supabase table editor).
 */
async function main() {
  const supabase = getAdminClient();
  const { data: rows, error } = await supabase.from("puzzles").select("*");
  if (error) throw error;

  let hasErrors = false;
  const dated: { label: string; date: string; answer: string }[] = [];

  for (const row of rows ?? []) {
    const label = `${row.date ?? "(no date)"} #${row.number ?? "?"}`;
    const result = puzzleSchema.safeParse(row);
    if (!result.success) {
      hasErrors = true;
      console.error(`${label}: schema validation failed`);
      for (const issue of result.error.issues) {
        console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      continue;
    }

    if (result.data.date) {
      dated.push({ label, date: result.data.date, answer: normalizeGuess(result.data.answer) });
    }
  }

  // Duplicate-answer check within the rolling window: any two dated puzzles
  // with the same normalized answer whose dates fall within the window.
  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      if (dated[i].answer !== dated[j].answer) continue;
      const diffDays =
        Math.abs(new Date(dated[i].date).getTime() - new Date(dated[j].date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diffDays < DUPLICATE_WINDOW_DAYS) {
        hasErrors = true;
        console.error(
          `Duplicate answer within ${DUPLICATE_WINDOW_DAYS}-day window: ${dated[i].label} and ${dated[j].label}`,
        );
      }
    }
  }

  if (hasErrors) {
    console.error(`\nValidation failed for ${rows?.length ?? 0} row(s).`);
    process.exit(1);
  }

  console.log(`All ${rows?.length ?? 0} row(s) passed validation.`);
}

main();
