"use client";

export const dynamic = "force-dynamic";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { AuthShell } from "@/components/auth/auth-shell";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { SupabaseConfigAlert } from "@/components/auth/supabase-config-alert";
import { Button, Input } from "@/components/ui";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";
  const [loading, setLoading] = useState(false);
  const [canSignIn, setCanSignIn] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetch("/api/auth/supabase-config")
      .then((r) => r.json())
      .then((d: { authViaApi?: boolean }) => setCanSignIn(Boolean(d.authViaApi)))
      .catch(() => setCanSignIn(false));
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "auth_callback") {
      toast.error("Sign-in link expired or invalid. Request a new confirmation email or try signing in.");
    } else if (err === "supabase_not_configured") {
      toast.error("Authentication is not configured on this deployment.");
    } else if (err === "oauth" || err === "oauth_invalid_provider") {
      const msg = searchParams.get("message");
      toast.error(msg ? decodeURIComponent(msg) : "Social sign-in failed. Try email and password, or contact your admin.");
    }
  }, [searchParams]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Could not sign in");
        return;
      }

      router.push(next.startsWith("/") ? next : "/home");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your chapter or team workspace."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <SupabaseConfigAlert />
      <React.Suspense fallback={null}>
        <OAuthButtons disabled={!canSignIn} mode="signin" />
      </React.Suspense>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@university.edu"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
          trailing={
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot?
            </Link>
          }
        />

        <Button type="submit" loading={loading} className="mt-2 w-full" disabled={!canSignIn}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
