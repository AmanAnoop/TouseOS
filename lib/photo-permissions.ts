import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type RoleName } from "@/lib/permissions";

export interface PhotoPermissions {
  who_can_upload: "all_members" | "officers_only" | "pr_team";
  require_approval: boolean;
  auto_instagram_ready: boolean;
  officer_only_albums: boolean;
}

export const DEFAULT_PHOTO_PERMISSIONS: PhotoPermissions = {
  who_can_upload: "all_members",
  require_approval: true,
  auto_instagram_ready: false,
  officer_only_albums: false,
};

export async function getOrgPhotoPermissions(
  supabase: SupabaseClient,
  orgId: string,
): Promise<PhotoPermissions> {
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();

  const settings = (data?.settings ?? {}) as Record<string, unknown>;
  const saved = (settings.photo_permissions ?? {}) as Partial<PhotoPermissions>;
  return { ...DEFAULT_PHOTO_PERMISSIONS, ...saved };
}

export function canUploadPhotos(role: RoleName, perms: PhotoPermissions): boolean {
  if (perms.who_can_upload === "all_members") return true;
  if (perms.who_can_upload === "officers_only") {
    return can(role, "manage_org_settings") || can(role, "approve_photos") || can(role, "manage_events");
  }
  if (perms.who_can_upload === "pr_team") {
    return can(role, "approve_photos") || can(role, "manage_events");
  }
  return true;
}

export function initialPhotoStatus(perms: PhotoPermissions): "pending" | "approved" {
  return perms.require_approval ? "pending" : "approved";
}

export function initialInstagramReady(perms: PhotoPermissions, status: string): boolean {
  return status === "approved" && perms.auto_instagram_ready;
}
