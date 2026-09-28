"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, UsersRound, Mail, KeyRound, Key, CheckCircle, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google";

type AuthMethod = "password" | "magic_link" | "otp";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const authErrorParam = searchParams.get("error");
  const authMessageParam = searchParams.get("message");
  const t = useTranslations("LoginPage");

  const [method, setMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle URL query parameters (errors or notifications)
  useEffect(() => {
    if (authErrorParam) {
      if (authErrorParam === "auth_callback_failed") {
        setError(t("authCallbackFailed"));
      } else {
        setError(decodeURIComponent(authErrorParam));
      }
    }
  }, [authErrorParam, t]);

  useEffect(() => {
    if (authMessageParam === "password_updated") {
      setInfoMessage("Your password has been updated. Please sign in.");
    }
  }, [authMessageParam]);

  const destination = inviteToken
    ? `/join/${encodeURIComponent(inviteToken)}`
    : "/dashboard";

  // Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  // Password sign-in
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = destination;
  };

  // Magic Link sign-in
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setCooldown(60);
    setLoading(false);
  };

  // Send OTP code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) return;

    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setOtpSent(true);
    setCooldown(60);
    setLoading(false);
  };

  // Verify OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode.trim(),
      type: "email",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = destination;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            {inviteToken ? (
              <UsersRound className="h-6 w-6 text-primary" />
            ) : (
              <MessageSquare className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl text-foreground">
            {inviteToken ? t("titleAccept") : t("titleWelcome")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {inviteToken ? t("descAccept") : t("descWelcome")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              {infoMessage}
            </div>
          )}

          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2 border-border bg-muted/60 text-foreground hover:bg-muted"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            {t("continueWithGoogle")}
          </Button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative bg-card px-2 text-xs uppercase tracking-wider text-muted-foreground">
              {t("or")}
            </div>
          </div>

          {/* Auth Method Selector */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-xs font-medium text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setMethod("password");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all ${
                method === "password"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {t("tabPassword")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("magic_link");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all ${
                method === "magic_link"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              {t("tabMagicLink")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("otp");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-all ${
                method === "otp"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground"
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              {t("tabOtp")}
            </button>
          </div>

          {/* Form Method: Password */}
          {method === "password" && (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  {t("emailLabel")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-muted-foreground">
                    {t("passwordLabel")}
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? t("signingIn") : t("signIn")}
              </Button>
            </form>
          )}

          {/* Form Method: Magic Link */}
          {method === "magic_link" && (
            <div className="flex flex-col gap-4">
              {magicLinkSent ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {t("magicLinkSentTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.rich("magicLinkSentDesc", {
                        email,
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cooldown > 0 || loading}
                    onClick={handleMagicLinkSubmit}
                    className="mt-2 text-xs border-border"
                  >
                    {cooldown > 0
                      ? t("resendIn", { seconds: cooldown })
                      : t("resend")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="magic-email" className="text-muted-foreground">
                      {t("emailLabel")}
                    </Label>
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? t("sendingLink") : t("sendMagicLink")}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Form Method: OTP Code */}
          {method === "otp" && (
            <div className="flex flex-col gap-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="otp-email" className="text-muted-foreground">
                      {t("emailLabel")}
                    </Label>
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? t("sendingOtpCode") : t("sendOtpCode")}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <p className="text-xs text-muted-foreground">
                    {t.rich("otpSentDesc", { email })}
                  </p>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="otp-code" className="text-muted-foreground">
                      {t("otpLabel")}
                    </Label>
                    <Input
                      id="otp-code"
                      type="text"
                      maxLength={6}
                      placeholder={t("otpPlaceholder")}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      required
                      className="border-border bg-muted text-foreground text-center tracking-widest text-lg font-mono placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || otpCode.trim().length !== 6}
                    className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? t("verifyingOtp") : t("verifyOtp")}
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={() => handleSendOtp()}
                      className="text-primary hover:text-primary/80 disabled:opacity-50"
                    >
                      {cooldown > 0
                        ? t("resendIn", { seconds: cooldown })
                        : t("resend")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                  : "/signup"
              }
              className="text-primary hover:text-primary/80"
            >
              {t("createAccount")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
