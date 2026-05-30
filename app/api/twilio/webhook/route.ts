import { createServiceClient } from "@/lib/supabase/server";
import { isOptOut, isHelpRequest } from "@/lib/twilio";

// Twilio webhook for inbound SMS (STOP/HELP handling)
export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = formData.get("Body") as string;

  const supabase = await createServiceClient();

  if (isOptOut(body)) {
    // Mark opted out
    await supabase
      .from("pnm_leads")
      .update({
        opted_out: true,
        opted_out_at: new Date().toISOString(),
      })
      .eq("phone", from);

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been unsubscribed and will receive no further messages. Reply HELP for help.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  if (isHelpRequest(body)) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>TouseOS: You are receiving messages from a college chapter using TouseOS. Reply STOP to opt out at any time. Msg &amp; data rates may apply.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  // Log inbound for conversation tracking
  await supabase.from("pnm_texts").insert({
    org_id: null,
    to_phone: from,
    body,
    status: "delivered",
    is_mass_send: false,
    sent_at: new Date().toISOString(),
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}
