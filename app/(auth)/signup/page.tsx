"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
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
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (signUpData.session) {
      toast.success("Account created — set up your organization");
      router.push("/onboarding");
      router.refresh();
      return;
    }

    toast.success("Check your email to confirm your account, then sign in to create your organization.");
    router.push("/login?next=/onboarding");
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Officers and members start here — you'll pick your campus and chapter colors next."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
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

        <Button type="submit" loading={loading} className="w-full mt-2">
          Continue to setup
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground mt-4 pt-2 border-t border-border">
        By signing up you agree to our{" "}
        <Link href="/terms" className="underline text-campus-600">Terms</Link> and{" "}
        <Link href="/privacy" className="underline text-campus-600">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
