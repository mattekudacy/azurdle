import { createClient } from "@supabase/supabase-js";
import { todayUtc } from "../src/lib/date";

const MIN_QUEUE_DAYS = 7;
const MIN_RESERVES = 5;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * Warns (exit 1) when the queued buffer drops below 7 days or the reserve
 * pool drops below 5 puzzles. Intended to run on a schedule and surface as
 * a GitHub Actions issue/email per CLAUDE.md's alerting requirement.
 */
async function main() {
  const supabase = getAdminClient();
  const today = todayUtc();

  const [{ count: queuedCount, error: queuedError }, { count: reserveCount, error: reserveError }] =
    await Promise.all([
      supabase
        .from("puzzles")
        .select("date", { count: "exact", head: true })
        .in("status", ["queued", "live"])
        .gte("date", today),
      supabase.from("puzzles").select("date", { count: "exact", head: true }).eq("status", "reserve"),
    ]);

  if (queuedError) throw queuedError;
  if (reserveError) throw reserveError;

  let hasWarning = false;

  if ((queuedCount ?? 0) < MIN_QUEUE_DAYS) {
    hasWarning = true;
    console.warn(`WARNING: queued buffer is ${queuedCount} day(s), below the minimum of ${MIN_QUEUE_DAYS}.`);
  } else {
    console.log(`Queued buffer: ${queuedCount} day(s) (>= ${MIN_QUEUE_DAYS})`);
  }

  if ((reserveCount ?? 0) < MIN_RESERVES) {
    hasWarning = true;
    console.warn(`WARNING: reserve pool is ${reserveCount} puzzle(s), below the minimum of ${MIN_RESERVES}.`);
  } else {
    console.log(`Reserve pool: ${reserveCount} puzzle(s) (>= ${MIN_RESERVES})`);
  }

}

main();
