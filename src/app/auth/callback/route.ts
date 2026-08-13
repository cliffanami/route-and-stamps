import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Both Google OAuth and email-OTP sign-in use the PKCE flow: the provider
// redirects here with a `code` that must be exchanged for a session
// server-side (it sets httpOnly cookies) before the browser has one.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/trips";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
