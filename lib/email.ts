import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "TouseOS <onboarding@resend.dev>";

export function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function getAudienceMembers(
  supabase: SupabaseClient,
  orgId: string,
  audience: string,
): Promise<Array<{ email: string; full_name: string }>> {
  let query = supabase
    .from("member_profiles")
    .select("email, full_name, role, membership_status, payment_status")
    .eq("org_id", orgId)
    .not("email", "is", null);

  switch (audience) {
    case "officers":
      query = query.in("role", [
        "owner", "president", "vice_president", "treasurer", "secretary",
        "social_chair", "recruitment_chair", "risk_manager", "captain", "coach",
      ]);
      break;
    case "new_members":
      query = query.eq("membership_status", "new_member");
      break;
    case "unpaid":
      query = query.neq("payment_status", "current");
      break;
    case "alumni":
      query = query.eq("membership_status", "alumni");
      break;
    case "active":
    case "all":
    default:
      query = query.in("membership_status", ["active", "new_member"]);
      break;
  }

  const { data } = await query;
  return (data ?? [])
    .filter((m: { email: string | null }) => m.email)
    .map((m: { email: string; full_name: string }) => ({
      email: m.email,
      full_name: m.full_name,
    }));
}

export async function sendBulkEmail(options: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ sent: number; failed: number; mode: "live" | "log" }> {
  const resend = getResendClient();
  if (!resend || options.to.length === 0) {
    return { sent: 0, failed: 0, mode: "log" };
  }

  let sent = 0;
  let failed = 0;

  // Resend batch — send in chunks of 50
  for (let i = 0; i < options.to.length; i += 50) {
    const batch = options.to.slice(i, i + 50);
    try {
      await resend.batch.send(
        batch.map((email) => ({
          from: FROM_EMAIL,
          to: email,
          subject: options.subject,
          html: options.html,
        })),
      );
      sent += batch.length;
    } catch {
      failed += batch.length;
    }
  }

  return { sent, failed, mode: "live" };
}

export async function sendInviteEmail(options: {
  to: string;
  orgName: string;
  inviteCode: string;
  appUrl?: string;
}): Promise<{ sent: boolean; mode: "live" | "log" }> {
  const base = options.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const html = `
    <p style="font-family:sans-serif;font-size:14px;">You've been invited to join <strong>${options.orgName}</strong> on TouseOS.</p>
    <p style="font-family:sans-serif;font-size:14px;">Sign up at <a href="${base}/signup">${base}/signup</a> and use invite code: <strong>${options.inviteCode}</strong></p>
    <p style="font-family:sans-serif;font-size:14px;">Or go to onboarding: <a href="${base}/onboarding">${base}/onboarding</a></p>
  `;
  const resend = getResendClient();
  if (!resend) {
    console.info("[email:invite]", options.to, options.inviteCode);
    return { sent: false, mode: "log" };
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: `Invitation to join ${options.orgName} on TouseOS`,
      html,
    });
    return { sent: true, mode: "live" };
  } catch {
    return { sent: false, mode: "log" };
  }
}

export function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px;font-family:sans-serif;font-size:14px;">${line || "&nbsp;"}</p>`)
    .join("");
}
