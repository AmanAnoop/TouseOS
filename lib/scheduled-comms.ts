import type { SupabaseClient } from "@supabase/supabase-js";
import { getAudienceMembers, sendBulkEmail, textToHtml } from "@/lib/email";
import { isTwilioConfigured } from "@/lib/integrations";
import { sendMassSms, isWithinQuietHours } from "@/lib/twilio";
import { getOrgSmsDisplayName } from "@/lib/sms-branding";

export interface ScheduledMessageRow {
  id: string;
  org_id: string;
  channel: string;
  title: string | null;
  body: string;
  audience: string[] | string;
  created_by: string;
  scheduled_for: string;
}

export interface ProcessScheduledResult {
  processed: number;
  skipped: number;
  errors: string[];
}

function audienceKey(audience: string[] | string): string {
  return Array.isArray(audience) ? (audience[0] ?? "all") : "all";
}

/** Send due scheduled_messages (announcement, email, sms). */
export async function processDueScheduledMessages(
  supabase: SupabaseClient,
  options?: { respectQuietHours?: boolean },
): Promise<ProcessScheduledResult> {
  const now = new Date().toISOString();
  const { data: due } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  let processed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const msg of (due ?? []) as ScheduledMessageRow[]) {
    const audience = audienceKey(msg.audience);

    try {
      if (msg.channel === "announcement") {
        await supabase.from("announcements").insert({
          org_id: msg.org_id,
          author_id: msg.created_by,
          title: msg.title ?? "Scheduled announcement",
          body: msg.body,
          audience: Array.isArray(msg.audience) ? msg.audience : [audience],
        });
      } else if (msg.channel === "email") {
        const members = await getAudienceMembers(supabase, msg.org_id, audience);
        const emails = members.map((m) => m.email).filter(Boolean);
        if (emails.length > 0) {
          await sendBulkEmail({
            to: emails,
            subject: msg.title ?? "Chapter update",
            html: textToHtml(msg.body),
          });
        }
      } else if (msg.channel === "sms") {
        if (!isTwilioConfigured()) {
          errors.push(`SMS scheduled message ${msg.id}: Twilio not configured`);
          skipped++;
          continue;
        }
        if (options?.respectQuietHours && isWithinQuietHours(new Date())) {
          skipped++;
          continue;
        }
        const { data: members } = await supabase
          .from("member_profiles")
          .select("full_name, phone")
          .eq("org_id", msg.org_id)
          .eq("membership_status", "active")
          .not("phone", "is", null);

        const recipients = (members ?? [])
          .filter((m: { phone: string | null }) => m.phone)
          .map((m: { phone: string; full_name: string }) => ({
            phone: m.phone,
            name: m.full_name,
          }));

        if (recipients.length === 0) {
          errors.push(`SMS scheduled message ${msg.id}: no recipients with phone numbers`);
          skipped++;
          continue;
        }

        const orgName = await getOrgSmsDisplayName(supabase, msg.org_id);
        await sendMassSms(recipients, msg.body, undefined, { orgName });
        await supabase.from("audit_logs").insert({
          org_id: msg.org_id,
          actor_id: msg.created_by,
          action: "scheduled_sms_sent",
          resource_type: "comms",
          metadata: { scheduled_message_id: msg.id, recipient_count: recipients.length },
        });
      } else {
        errors.push(`Unknown channel: ${msg.channel}`);
        skipped++;
        continue;
      }

      await supabase
        .from("scheduled_messages")
        .update({ status: "sent", sent_at: now })
        .eq("id", msg.id);

      processed++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      errors.push(`Message ${msg.id}: ${message}`);
      skipped++;
    }
  }

  return { processed, skipped, errors };
}
