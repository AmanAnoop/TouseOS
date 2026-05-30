"use client";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card } from "@/components/ui";

const schema = z.object({ email: z.string().email("Valid email required") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <Card>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-greek-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-greek-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-bold text-foreground">Check your email</h2>
          <p className="text-sm text-muted-foreground mt-1">We sent a password reset link to your inbox.</p>
          <Link href="/login" className="block mt-4 text-sm text-greek-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Reset password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send a reset link.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" type="email" placeholder="you@university.edu" error={errors.email?.message} {...register("email")} />
        <Button type="submit" className="w-full">Send reset link</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-4">
        <Link href="/login" className="text-greek-600 hover:underline">Back to sign in</Link>
      </p>
    </Card>
  );
}
