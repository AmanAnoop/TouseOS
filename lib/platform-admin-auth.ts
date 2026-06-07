import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function requirePlatformAdmin(
  supabase: SupabaseClient,
): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!isPlatformAdminEmail(user.email)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, email: user.email };
}
