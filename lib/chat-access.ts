import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type RoleName } from "@/lib/permissions";

export function canManageChats(role: RoleName): boolean {
  return can(role, "send_mass_texts") || can(role, "manage_events") || can(role, "manage_org_settings");
}

export function canPostInRoom(params: {
  role: RoleName;
  announcementsOnly: boolean;
  isReply: boolean;
}): boolean {
  if (params.isReply) return true;
  if (!params.announcementsOnly) return true;
  return canManageChats(params.role);
}

export async function ensureRoomMember(
  supabase: SupabaseClient,
  roomId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("chat_room_members")
    .select("id, timeout_until")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  if (data.timeout_until && new Date(String(data.timeout_until)) > new Date()) {
    return false;
  }
  return true;
}

export function dmUserPair(a: string, b: string): string[] {
  return [a, b].sort();
}
