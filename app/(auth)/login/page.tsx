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
import { AuthShell } from "@/components/auth/auth-shell";
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
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

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
      toast.error(error.message);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Enter your chapter or team workspace."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
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
            <Link href="/forgot-password" className="text-xs text-campus-600 hover:underline font-medium">
              Forgot?
            </Link>
          }
        />

        <Button type="submit" loading={loading} className="w-full mt-2">
          Sign in to command center
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground font-serif">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
