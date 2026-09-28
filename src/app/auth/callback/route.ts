import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Check for error parameters passed from OAuth providers (e.g. access_denied)
  const authError = searchParams.get("error");
  const authErrorDescription = searchParams.get("error_description");
  if (authError) {
    const redirectUrl = new URL(`${origin}/login`);
    redirectUrl.searchParams.set("error", authErrorDescription || authError);
    return NextResponse.redirect(redirectUrl.toString());
  }

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") || "/dashboard";

  // Prevent open redirect vulnerabilities: Ensure next starts with single '/' and not '//'
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Auth callback code exchange error:", error.message);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Auth callback verifyOtp error:", error.message);
  }

  // If parameters are missing or exchange failed, redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
