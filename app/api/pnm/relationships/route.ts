import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import {
  isValidRelationshipType,
  suggestPnmRelationships,
  type MemberForSuggestion,
  type PnmForSuggestion,
} from "@/lib/pnm-relationship-suggestions";
import { rankRushMatches, type RushProfile, type MemberRushProfile } from "@/lib/rush-matcher";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const pnmId = searchParams.get("pnm_id");
  const suggest = searchParams.get("suggest") === "true";

  if (!orgId || !pnmId) {
    return NextResponse.json({ error: "org_id and pnm_id required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "view_recruitment") && !can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: relationships, error } = await supabase
    .from("pnm_relationships")
    .select("*, member_profiles(id, full_name, profile_photo_url, major, hometown, class_year)")
    .eq("pnm_id", pnmId)
    .order("strength", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let suggestions: ReturnType<typeof suggestPnmRelationships> = [];
  if (suggest) {
    const { data: pnm } = await supabase
      .from("pnm_leads")
      .select("referral_source, active_member_connection, major, hometown, class_year, interests, tags, full_name")
      .eq("id", pnmId)
      .eq("org_id", orgId)
      .single();

    const { data: members } = await supabase
      .from("member_profiles")
      .select("id, full_name, major, hometown, class_year, interests, role")
      .eq("org_id", orgId)
      .in("membership_status", ["active", "new_member"]);

    if (pnm && members) {
      const rushMatches = rankRushMatches(
        pnm as RushProfile,
        members as MemberRushProfile[],
        5,
      );
      const existingIds = new Set(
        (relationships ?? []).map((r) => (r as { member_id: string }).member_id),
      );
      suggestions = suggestPnmRelationships(
        pnm as PnmForSuggestion,
        members as MemberForSuggestion[],
        rushMatches,
      ).filter((s) => !existingIds.has(s.memberId));
    }
  }

  return NextResponse.json({ relationships: relationships ?? [], suggestions });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    pnmId,
    memberId,
    relationshipType,
    strength,
    notes,
    isFollowUpOwner,
  } = await request.json();

  if (!pnmId || !memberId || !relationshipType) {
    return NextResponse.json({ error: "pnmId, memberId, relationshipType required" }, { status: 400 });
  }

  if (!isValidRelationshipType(relationshipType)) {
    return NextResponse.json({ error: "Invalid relationship type" }, { status: 400 });
  }

  const { data: pnm } = await supabase
    .from("pnm_leads")
    .select("org_id")
    .eq("id", pnmId)
    .single();

  if (!pnm) return NextResponse.json({ error: "PNM not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", pnm.org_id)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isFollowUpOwner) {
    await supabase
      .from("pnm_relationships")
      .update({ is_follow_up_owner: false })
      .eq("pnm_id", pnmId);
  }

  const { data, error } = await supabase
    .from("pnm_relationships")
    .upsert({
      pnm_id: pnmId,
      member_id: memberId,
      relationship_type: relationshipType,
      strength: Math.min(5, Math.max(1, parseInt(String(strength ?? 3), 10))),
      notes: notes || null,
      is_follow_up_owner: Boolean(isFollowUpOwner),
    }, { onConflict: "pnm_id,member_id" })
    .select("*, member_profiles(id, full_name, profile_photo_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isFollowUpOwner) {
    await supabase
      .from("pnm_leads")
      .update({ active_member_connection: (data.member_profiles as { full_name?: string })?.full_name ?? null })
      .eq("id", pnmId);
  }

  return NextResponse.json({ relationship: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("pnm_relationships").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
