"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { SupabaseConfigAlert } from "@/components/auth/supabase-config-alert";
import { Button, Input } from "@/components/ui";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setReady(Boolean(data.session));
        if (!data.session) {
          toast.error("Open the reset link from your email, or request a new one.");
        }
      })
      .catch(() => setReady(false));
  }, []);

  async function onSubmit(data: FormData) {
    if (!isSupabaseConfigured()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        toast.error(friendlyAuthError(error.message));
        return;
      }
      toast.success("Password updated — you can sign in now.");
      router.push("/login");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Set new password"
      subtitle="Choose a new password for your account."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <SupabaseConfigAlert />
      {!ready ? (
        <p className="text-sm text-muted-foreground">
          Use the link in your password reset email. If it expired,{" "}
          <Link href="/forgot-password" className="text-primary hover:underline">
            request another
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" loading={loading} className="w-full">
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
