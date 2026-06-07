import { redirect } from "next/navigation";

/** Supabase auth is primary — never show Clerk sign-in UI. */
export default function SignInPage() {
  redirect("/login");
}
