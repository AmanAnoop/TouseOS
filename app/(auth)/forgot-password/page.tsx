"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getPublicAppOrigin } from "@/lib/supabase/env";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { SupabaseConfigAlert } from "@/components/auth/supabase-config-alert";
import { Button, Input } from "@/components/ui";

const schema = z.object({ email: z.string().email("Valid email required") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!isSupabaseConfigured()) {
      toast.error("Password reset is not configured on this server.");
      return;
    }

    try {
      const supabase = createClient();
      const origin = getPublicAppOrigin(window.location.origin) || window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo });
      if (error) {
        toast.error(friendlyAuthError(error.message));
        return;
      }
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send reset email");
    }
  }

  return (
    <AuthShell
      title={done ? "Check your email" : "Reset password"}
      subtitle={
        done
          ? "We sent a link to reset your password."
          : "Enter your email and we will send a reset link."
      }
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <SupabaseConfigAlert />
      {done ? (
        <p className="text-sm text-muted-foreground">
          Open the link in your inbox to choose a new password. The link expires after a short time.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@university.edu"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" className="w-full" disabled={!isSupabaseConfigured()}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
