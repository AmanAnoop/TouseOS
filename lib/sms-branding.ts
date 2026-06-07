import type { SupabaseClient } from "@supabase/supabase-js";

const OPT_OUT = "Reply STOP to opt out.";

/** Prefix outbound SMS with the chapter name (Settings → Profile). */
export function formatChapterSms(body: string, orgName?: string | null): string {
  const trimmed = body.trim();
  if (!trimmed) return trimmed;

  const name = orgName?.trim();
  let message = trimmed;

  if (name) {
    const prefix = `${name}:`;
    const alreadyBranded =
      trimmed.startsWith(prefix) ||
      trimmed.startsWith(`${name} `) ||
      trimmed.toLowerCase().startsWith(name.toLowerCase() + ":");
    if (!alreadyBranded) {
      message = `${prefix} ${trimmed}`;
    }
  }

  if (!/reply stop/i.test(message)) {
    message = `${message} ${OPT_OUT}`;
  }

  return message.slice(0, 1600);
}

export async function getOrgSmsDisplayName(
  supabase: SupabaseClient,
  orgId: string,
): Promise<string | undefined> {
  const { data } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  const name = data?.name ? String(data.name).trim() : "";
  return name || undefined;
}
