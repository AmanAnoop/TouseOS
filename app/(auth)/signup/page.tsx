"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
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
  const [canSignUp, setCanSignUp] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetch("/api/auth/supabase-config")
      .then((r) => r.json())
      .then((d: { authViaApi?: boolean }) => setCanSignUp(Boolean(d.authViaApi)))
      .catch(() => setCanSignUp(false));
  }, []);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Could not create account");
        if (json.issues?.length) {
          console.error("Supabase config:", json.issues);
        }
        return;
      }

      if (json.hasSession) {
        toast.success("Account created — set up your organization");
        router.push("/onboarding");
        router.refresh();
        return;
      }

      toast.success(
        "Check your email for a confirmation link. After confirming, you will be signed in to set up your organization.",
      );
      router.push("/login?next=/onboarding");
    } catch {
      toast.error("Could not reach the server. Try again.");
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

        <Button type="submit" loading={loading} className="mt-2 w-full" disabled={!canSignUp}>
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
