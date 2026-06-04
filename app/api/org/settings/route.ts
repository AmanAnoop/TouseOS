import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { colorsForOrgStorage } from "@/lib/chapter-theme";
import { getGreekOrgById } from "@/lib/greek-letter-orgs";
import { getProductId } from "@/lib/org-product";
import { getUniversityById } from "@/lib/university-colors";

const ADMIN_ROLES = ["owner", "president", "advisor"];

async function membershipRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
) {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await membershipRole(supabase, user.id, orgId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: org, error } = await supabase
    .from("organizations")
    .select("*, platform_plan, platform_plan_status")
    .eq("id", orgId)
    .single();

  if (error || !org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { data: members } = await supabase
    .from("org_members")
    .select("*, profiles(full_name, avatar_url), member_profiles(id, full_name, email)")
    .eq("org_id", orgId)
    .order("joined_at");

  return NextResponse.json({ org, members: members ?? [], myRole: role });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId,
    name,
    campus,
    councilOrLeague,
    contactEmail,
    privacy,
    primaryColor,
    secondaryColor,
    universityId,
    greekAffiliationId,
    regenerateInviteCode,
    settingsPatch,
  } = body;

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await membershipRole(supabase, user.id, orgId);
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("organizations")
    .select("type, settings, invite_code, primary_color, secondary_color")
    .eq("id", orgId)
    .single();

  if (!existing) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (regenerateInviteCode) {
    updates.invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  if (settingsPatch && typeof settingsPatch === "object") {
    const prevSettings = (existing.settings ?? {}) as Record<string, unknown>;
    updates.settings = { ...prevSettings, ...settingsPatch };
  }

  const prevSettings = (existing.settings ?? {}) as Record<string, unknown>;
  const orgType = String(existing.type ?? "fraternity");
  const identityTouched =
    name !== undefined ||
    campus !== undefined ||
    councilOrLeague !== undefined ||
    contactEmail !== undefined ||
    privacy !== undefined ||
    primaryColor !== undefined ||
    secondaryColor !== undefined ||
    universityId !== undefined ||
    greekAffiliationId !== undefined;

  if (identityTouched) {
    const stored = colorsForOrgStorage({
      product: getProductId(orgType),
      greekOrg: getGreekOrgById(greekAffiliationId ?? String(prevSettings.greek_affiliation_id ?? "")),
      university: getUniversityById(universityId ?? String(prevSettings.university_id ?? "")),
      primaryColor: primaryColor ?? String(existing.primary_color ?? "#004225"),
      secondaryColor: secondaryColor ?? String(existing.secondary_color ?? "#0B1F3A"),
    });
    if (name !== undefined) updates.name = name;
    if (campus !== undefined) updates.campus = campus || null;
    if (councilOrLeague !== undefined) updates.council_or_league = councilOrLeague || null;
    if (contactEmail !== undefined) updates.contact_email = contactEmail || null;
    if (privacy !== undefined) updates.privacy = privacy;
    updates.primary_color = stored.primary_color;
    updates.secondary_color = stored.secondary_color;
    updates.settings = {
      ...prevSettings,
      ...(settingsPatch ?? {}),
      university_id: universityId !== undefined ? universityId : prevSettings.university_id ?? null,
      greek_affiliation_id:
        greekAffiliationId !== undefined ? greekAffiliationId : prevSettings.greek_affiliation_id ?? null,
    };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", orgId)
    .select("*, platform_plan, platform_plan_status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}
