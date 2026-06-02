"use client";

export const dynamic = "force-dynamic";
import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Input, Card } from "@/components/ui";
import { getSupabaseEnvStatus } from "@/lib/supabase/env-status";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const envStatus = getSupabaseEnvStatus();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(data);
    setLoading(false);

    if (error) {
      const msg = error.message.includes("fetch failed")
        ? "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and your API key in .env.local, then restart npm run dev."
        : error.message;
      toast.error(msg);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your TouseOS workspace.
        </p>
      </div>

      {!envStatus.configured && envStatus.message && (
        <Alert type="error" title="Supabase not configured" description={envStatus.message} className="mb-4" />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@university.edu"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end mt-1">
            <Link href="/forgot-password" className="text-xs text-greek-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full mt-1">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        No account?{" "}
        <Link href="/signup" className="text-greek-600 font-medium hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
