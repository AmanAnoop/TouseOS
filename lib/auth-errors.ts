/** Map Supabase auth errors to clearer messages for officers and members. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("email not confirmed") || m.includes("email confirmation")) {
    return "Confirm your email using the link we sent, then sign in.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (m.includes("password should be at least")) {
    return "Password does not meet Supabase requirements (usually at least 6 characters).";
  }
  if (m.includes("signup is disabled")) {
    return "New sign-ups are disabled in Supabase. Ask your admin to enable sign-ups.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (m.includes("invalid api key") || m.includes("invalid jwt")) {
    return "Supabase API key is invalid for this app. In Vercel, set NEXT_PUBLIC_SUPABASE_ANON_KEY to the anon (public) key from Supabase → Settings → API — not the service_role secret. Redeploy after changing env vars.";
  }
  if (m.includes("oauth") || m.includes("provider") || m.includes("identity")) {
    return "Social sign-in failed. Confirm Google or Apple is enabled in Supabase → Authentication → Providers.";
  }
  if (m.includes("user cancelled") || m.includes("access_denied")) {
    return "Sign-in was cancelled. Try again when ready.";
  }

  return message;
}
