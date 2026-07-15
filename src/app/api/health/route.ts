import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Pinged by a scheduled Action to keep the Supabase free-tier project from
 * pausing on inactivity pre-launch. */
export async function GET() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("puzzles").select("date", { head: true, count: "exact" });
  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
