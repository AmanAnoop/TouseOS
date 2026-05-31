import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAudienceMembers, sendBulkEmail, textToHtml } from "@/lib/email";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date().toISOString();
  const { data: due } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  let processed = 0;

  for (const msg of due ?? []) {
    const audience = Array.isArray(msg.audience) ? msg.audience[0] : "all";

    if (msg.channel === "announcement") {
      await supabase.from("announcements").insert({
        org_id: msg.org_id,
        author_id: msg.created_by,
        title: msg.title ?? "Scheduled announcement",
        body: msg.body,
        audience: msg.audience,
      });
    } else if (msg.channel === "email") {
      const members = await getAudienceMembers(supabase, msg.org_id, audience);
      const emails = members.map((m) => m.email);
      await sendBulkEmail({
        to: emails,
        subject: msg.title ?? "Chapter update",
        html: textToHtml(msg.body),
      });
    }

    await supabase.from("scheduled_messages").update({
      status: "sent",
      sent_at: now,
    }).eq("id", msg.id);

    processed++;
  }

  return NextResponse.json({ processed });
}
