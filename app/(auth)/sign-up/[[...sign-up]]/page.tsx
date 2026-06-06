import { redirect } from "next/navigation";

/** Supabase auth is primary — never show Clerk sign-up UI. */
export default function SignUpPage() {
  redirect("/signup");
}
