"use client";

export const dynamic = "force-dynamic";
import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "auth_callback") {
      toast.error("Sign-in link expired or invalid. Request a new confirmation email or try signing in.");
    } else if (err === "supabase_not_configured") {
      toast.error("Authentication is not configured on this deployment.");
    }
  }, [searchParams]);

  async function onSubmit(data: FormData) {
    if (!isSupabaseConfigured()) {
      toast.error("Sign-in is not configured on this server. Contact your administrator.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(data);
      if (error) {
        toast.error(friendlyAuthError(error.message));
        return;
      }
      router.push(next.startsWith("/") ? next : "/home");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign in");
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

        <Button type="submit" loading={loading} className="mt-2 w-full" disabled={!isSupabaseConfigured()}>
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
