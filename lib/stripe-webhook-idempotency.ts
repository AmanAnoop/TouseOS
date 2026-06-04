import type { SupabaseClient } from "@supabase/supabase-js";

/** Returns true if this event was already processed (skip duplicate work). */
export async function claimStripeWebhookEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<boolean> {
  const { error } = await supabase.from("stripe_webhook_events").insert({ event_id: eventId });
  if (error?.code === "23505") return false;
  if (error) return true;
  return true;
}
