import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

async function roleForOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
): Promise<RoleName> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("big_little_matches")
    .select(`
      *,
      big:member_profiles!big_little_matches_big_id_fkey(
        id, full_name, profile_photo_url, major, interests, class_year
      ),
      little:member_profiles!big_little_matches_little_id_fkey(
        id, full_name, profile_photo_url, major, interests, class_year
      )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const filtered = (data ?? []).filter((m: { big_id: string; little_id: string }) => m.big_id !== m.little_id);
  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, bigId, littleId, status, matchScore, revealDate } = await request.json();
  if (!orgId || !bigId || !littleId) {
    return NextResponse.json({ error: "orgId, bigId, and littleId required" }, { status: 400 });
  }
  if (bigId === littleId) {
    return NextResponse.json({ error: "A member cannot be matched with themselves" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "edit_roster") && !can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("big_little_matches").insert({
    org_id: orgId,
    big_id: bigId,
    little_id: littleId,
    status: status ?? "confirmed",
    match_score: matchScore ?? null,
    reveal_date: revealDate || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, status } = await request.json();
  if (!id || !orgId || !status) {
    return NextResponse.json({ error: "id, orgId, and status required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "edit_roster") && !can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("big_little_matches")
    .update({ status })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
