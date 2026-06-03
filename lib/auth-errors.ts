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

  return message;
}
