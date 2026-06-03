import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/api-org-role";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  if (!role) return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });

  const [mpRes, rolesRes, gmRes] = await Promise.all([
    supabase.from("member_profiles").select("*").eq("user_id", user.id).eq("org_id", orgId).maybeSingle(),
    supabase
      .from("org_members")
      .select("org_id, role, organizations(name, type)")
      .eq("user_id", user.id)
      .neq("status", "removed"),
    supabase.from("greekmatch_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (mpRes.error) return NextResponse.json({ error: mpRes.error.message }, { status: 500 });

  const memberships = (rolesRes.data ?? []).map((r: Record<string, unknown>) => ({
    org_id: String(r.org_id),
    role: String(r.role),
    org_name: String((r.organizations as Record<string, unknown>)?.name ?? ""),
    org_type: String((r.organizations as Record<string, unknown>)?.type ?? ""),
  }));

  return NextResponse.json({
    memberProfile: mpRes.data,
    memberships,
    greekMatchProfile: gmRes.data ?? null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const orgId = String(body.orgId ?? "");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  if (!role) return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });

  const updates: Record<string, unknown> = {};
  if (body.preferredName !== undefined) updates.preferred_name = body.preferredName || null;
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.classYear !== undefined) updates.class_year = body.classYear || null;
  if (body.graduationYear !== undefined) {
    updates.graduation_year = body.graduationYear ? parseInt(String(body.graduationYear), 10) : null;
  }
  if (body.major !== undefined) updates.major = body.major || null;
  if (body.hometown !== undefined) updates.hometown = body.hometown || null;
  if (body.bio !== undefined) updates.bio = body.bio || null;
  if (body.pronouns !== undefined) updates.pronouns = body.pronouns || null;
  if (body.emergencyContactName !== undefined) updates.emergency_contact_name = body.emergencyContactName || null;
  if (body.emergencyContactPhone !== undefined) updates.emergency_contact_phone = body.emergencyContactPhone || null;
  if (body.instagramUrl !== undefined) updates.instagram_url = body.instagramUrl || null;
  if (body.linkedinUrl !== undefined) updates.linkedin_url = body.linkedinUrl || null;
  if (body.twitterUrl !== undefined) updates.twitter_url = body.twitterUrl || null;
  if (body.profileVisibility !== undefined) updates.profile_visibility = body.profileVisibility;
  if (body.interests !== undefined) updates.interests = body.interests;
  if (body.profilePhotoUrl !== undefined) updates.profile_photo_url = body.profilePhotoUrl || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("member_profiles")
    .update(updates)
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memberProfile: data });
}
