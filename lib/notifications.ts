import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchPushForNotification } from "@/lib/push-notifications";

interface CreateNotificationParams {
  userId: string;
  orgId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  sendPush?: boolean;
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams,
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    org_id: params.orgId ?? null,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  });

  if (!error && params.sendPush !== false) {
    await dispatchPushForNotification(supabase, {
      userId: params.userId,
      title: params.title,
      body: params.body,
      link: params.link,
    });
  }

  return { error };
}

export async function notifyOrgOfficers(
  supabase: SupabaseClient,
  orgId: string,
  params: Omit<CreateNotificationParams, "userId" | "orgId">,
) {
  const { data: officers } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .in("role", [
      "owner", "president", "vice_president", "treasurer", "secretary",
      "social_chair", "recruitment_chair", "risk_manager", "captain", "coach",
    ]);

  for (const o of officers ?? []) {
    await createNotification(supabase, {
      ...params,
      userId: o.user_id,
      orgId,
    });
  }
}
