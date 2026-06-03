"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getPublicAppOrigin } from "@/lib/supabase/env";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { SupabaseConfigAlert } from "@/components/auth/supabase-config-alert";
import { Button, Input } from "@/components/ui";

const schema = z.object({
  fullName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!isSupabaseConfigured()) {
      toast.error("Sign-up is not configured on this server. Contact your administrator.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin = getPublicAppOrigin(window.location.origin) || window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
          emailRedirectTo,
        },
      });

      if (error) {
        toast.error(friendlyAuthError(error.message));
        return;
      }

      if (signUpData.session) {
        toast.success("Account created — set up your organization");
        router.push("/onboarding");
        router.refresh();
        return;
      }

      if (signUpData.user && !signUpData.user.identities?.length) {
        toast.error("An account with this email already exists. Sign in instead.");
        return;
      }

      toast.success(
        "Check your email for a confirmation link. After confirming, you will be signed in to set up your organization.",
      );
      router.push("/login?next=/onboarding");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Start with your name and email — then create or join an organization."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <SupabaseConfigAlert />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Full name"
          type="text"
          placeholder="Alex Johnson"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
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
          placeholder="8+ characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" loading={loading} className="mt-2 w-full" disabled={!isSupabaseConfigured()}>
          Create account
        </Button>
      </form>

      <p className="mt-4 border-t border-border pt-2 text-center text-xs text-muted-foreground">
        By signing up you agree to our{" "}
        <Link href="/terms" className="text-primary underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-primary underline">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}
