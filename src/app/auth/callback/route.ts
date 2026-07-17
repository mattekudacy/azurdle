import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const redirectUrl = `${origin}${next}?migrated=1`;
    const response = NextResponse.redirect(redirectUrl);

    // Build the Supabase client against the redirect response directly so
    // Set-Cookie headers land on the response the browser actually receives.
    // Using createClient() (next/headers) here loses the cookies — they get
    // written to an internal response object that is discarded when we return
    // our own NextResponse.redirect().
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[auth/callback] exchangeCodeForSession error:", error.message, error);
    if (!error) return response;
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
