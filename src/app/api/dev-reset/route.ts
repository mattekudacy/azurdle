import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/anon-progress";

// Dev-only: clears the HttpOnly anon-progress cookie so you can replay a
// puzzle without touching DevTools. Returns 404 in production.
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
