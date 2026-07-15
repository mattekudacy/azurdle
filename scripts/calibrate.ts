import { createClient } from "@supabase/supabase-js";
import { passesCalibration } from "./lib/calibration";
import { puzzleSchema } from "../src/lib/puzzle-schema";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * Re-runs the full calibration gate (difficulty + fact check — see
 * lib/calibration.ts) against every queued/reserve puzzle currently in
 * Supabase. There is no human review step; this is a standalone spot-check
 * you can run by hand, separate from generate-puzzles.ts's own inline
 * calibration before insert.
 */
async function main() {
  const supabase = getAdminClient();
  const { data: rows, error } = await supabase.from("puzzles").select("*").in("status", ["queued", "reserve"]);
  if (error) throw error;

  let failures = 0;

  for (const row of rows ?? []) {
    const puzzle = puzzleSchema.parse(row);
    const label = `${row.date ?? "(no date)"} #${row.number ?? "?"}`;
    console.log(`Calibrating ${label} (${puzzle.answer})`);
    const ok = await passesCalibration(puzzle);
    if (!ok) {
      failures += 1;
      console.error(`  FAILED calibration: ${label}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures}/${rows?.length ?? 0} puzzle(s) failed calibration.`);
    process.exit(1);
  }

  console.log(`\nAll ${rows?.length ?? 0} puzzle(s) passed calibration.`);
}

main();
