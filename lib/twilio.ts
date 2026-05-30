import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const FROM = process.env.TWILIO_MESSAGING_SERVICE_SID
  ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
  : { from: process.env.TWILIO_PHONE_NUMBER! };

export interface SendSmsResult {
  sid: string;
  status: string;
  error?: string;
}

export async function sendSms(
  to: string,
  body: string,
): Promise<SendSmsResult> {
  try {
    const msg = await client.messages.create({ ...FROM, to, body });
    return { sid: msg.sid, status: msg.status };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { sid: "", status: "failed", error: message };
  }
}

export async function sendMassSms(
  recipients: Array<{ phone: string; name: string }>,
  body: string,
  templateVars?: Record<string, string>,
): Promise<SendSmsResult[]> {
  const results: SendSmsResult[] = [];

  for (const recipient of recipients) {
    let personalizedBody = body;
    if (templateVars) {
      Object.entries(templateVars).forEach(([key, val]) => {
        personalizedBody = personalizedBody.replace(
          new RegExp(`{{${key}}}`, "g"),
          val,
        );
      });
    }
    personalizedBody = personalizedBody.replace("{{name}}", recipient.name);

    const result = await sendSms(recipient.phone, personalizedBody);
    results.push(result);

    // Rate limiting – 1 msg/10ms (Twilio allows ~100/s on production)
    await new Promise((r) => setTimeout(r, 10));
  }

  return results;
}

export function isOptOut(body: string) {
  return /^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test(body.trim());
}

export function isHelpRequest(body: string) {
  return /^(help|info)$/i.test(body.trim());
}

export function isWithinQuietHours(
  date: Date,
  quietStart = 21,
  quietEnd = 9,
): boolean {
  const hour = date.getHours();
  if (quietStart > quietEnd) {
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}
