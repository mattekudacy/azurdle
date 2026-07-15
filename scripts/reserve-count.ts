import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/** Prints the current reserve-pool count to stdout, nothing else — used by
 * generate-puzzle.yml to decide whether to top up the reserve pool. */
async function main() {
  const supabase = getAdminClient();
  const { count, error } = await supabase
    .from("puzzles")
    .select("date", { count: "exact", head: true })
    .eq("status", "reserve");

  if (error) throw error;
  console.log(count ?? 0);
}

main();
