import twilio from "twilio";
import { isTwilioConfigured } from "@/lib/integrations";

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  if (!isTwilioConfigured()) return null;
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
  }
  return twilioClient;
}

function messageFrom(): { messagingServiceSid: string } | { from: string } {
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    return { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID };
  }
  return { from: process.env.TWILIO_PHONE_NUMBER! };
}

export interface SendSmsResult {
  sid: string;
  status: string;
  error?: string;
}

export async function sendSms(
  to: string,
  body: string,
): Promise<SendSmsResult> {
  const client = getTwilioClient();
  if (!client) {
    return {
      sid: "",
      status: "failed",
      error: "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID (or TWILIO_PHONE_NUMBER).",
    };
  }

  try {
    const msg = await client.messages.create({ ...messageFrom(), to, body });
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
  if (!isTwilioConfigured()) {
    return recipients.map(() => ({
      sid: "",
      status: "failed",
      error: "Twilio is not configured",
    }));
  }

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
