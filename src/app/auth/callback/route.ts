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

  const getDestinationUrl = async (): Promise<string> => {
    if (process.env.NEXT_PUBLIC_MAGIC_LINK_PASSWORD_STEP === "true") {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const passwordSet = user.user_metadata?.password_set === true;
          const createdAt = user.created_at
            ? new Date(user.created_at).getTime()
            : 0;
          const isWithin24Hours = Date.now() - createdAt < 24 * 60 * 60 * 1000;

          const providers: string[] = user.app_metadata?.providers || [];
          const identities = user.identities || [];
          const hasNonEmailIdentity =
            providers.some((p: string) => p !== "email") ||
            identities.some((i) => i.provider !== "email");

          if (!passwordSet && isWithin24Hours && !hasNonEmailIdentity) {
            const createPasswordUrl = new URL(`${origin}/create-password`);
            createPasswordUrl.searchParams.set("next", next);
            return createPasswordUrl.toString();
          }
        }
      } catch (err) {
        console.error("Error evaluating password setup step:", err);
      }
    }

    return `${origin}${next}`;
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = await getDestinationUrl();
      return NextResponse.redirect(destination);
    }
    console.error("Auth callback code exchange error:", error.message);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const destination = await getDestinationUrl();
      return NextResponse.redirect(destination);
    }
    console.error("Auth callback verifyOtp error:", error.message);
  }

  // If parameters are missing or exchange failed, redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
