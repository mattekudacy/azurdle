import { NextResponse } from "next/server";
import { getServiceInfo } from "@/lib/service-info";

// Public endpoint — returns description and docs for any service by name.
// Safe to expose: this is the same vocabulary the autocomplete already ships
// to the client as a static JSON asset. No puzzle content here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const info = getServiceInfo(name);
  if (!info) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(info);
}
