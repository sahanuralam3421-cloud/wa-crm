"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { KeyRound, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function CreatePasswordPage() {
  return (
    <Suspense fallback={null}>
      <CreatePasswordPageInner />
    </Suspense>
  );
}

function CreatePasswordPageInner() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          window.location.href = "/login";
          return;
        }

        // If the user already set a password, bypass this setup step
        if (user.user_metadata?.password_set === true) {
          window.location.href = next;
          return;
        }

        if (isMounted) {
          setCheckingSession(false);
        }
      } catch {
        window.location.href = "/login";
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [supabase, next]);

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        password_set: true,
      },
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Successfully updated password and metadata — proceed to destination
    window.location.href = next;
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl text-foreground">
            Create password
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Set a password for your account to easily sign in next time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePassword} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-muted-foreground">
                New password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Saving password..." : "Save and continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
