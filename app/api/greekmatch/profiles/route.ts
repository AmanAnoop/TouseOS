import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("greekmatch_profiles")
    .select("*, organizations(name, type)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Verify org is Greek
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, organizations(type)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1)
    .single();

  if (!membership) return NextResponse.json({ error: "Not in an organization" }, { status: 403 });
  const orgType = ((membership.organizations as unknown) as Record<string, unknown>)?.type as string;
  if (!["fraternity", "sorority"].includes(orgType)) {
    return NextResponse.json({ error: "GreekMatch is only available for Greek organizations" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("greekmatch_profiles")
    .upsert({
      user_id: user.id,
      org_id: membership.org_id,
      display_name: body.displayName,
      age: body.age ? parseInt(body.age) : null,
      bio: body.bio ?? null,
      gender: body.gender ?? null,
      interested_in: body.interestedIn ?? [],
      interests: body.interests ?? [],
      show_org_name: body.showOrgName ?? true,
      show_full_name: body.showFullName ?? false,
      same_org_ok: body.sameOrgOk ?? false,
      min_age: parseInt(body.minAge ?? "18"),
      max_age: parseInt(body.maxAge ?? "30"),
      is_active: true,
      paused: false,
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.photos !== undefined) updates.photos = body.photos;
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.paused !== undefined) updates.paused = body.paused;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  const { data, error } = await supabase
    .from("greekmatch_profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
