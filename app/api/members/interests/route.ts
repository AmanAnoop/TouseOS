import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId, interests } = await request.json();
  if (!memberId || !Array.isArray(interests)) {
    return NextResponse.json({ error: "memberId and interests array required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("id, org_id, user_id")
    .eq("id", memberId)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", profile.org_id)
    .single();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isSelf = profile.user_id === user.id;
  const officer = ["owner", "president", "vice_president", "recruitment_chair", "secretary"].includes(
    String(membership.role),
  );

  if (!isSelf && !officer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const normalized = [...new Set(
    interests.map((s: string) => String(s).toLowerCase().trim()).filter(Boolean),
  )].slice(0, 25);

  const { data, error } = await supabase
    .from("member_profiles")
    .update({ interests: normalized })
    .eq("id", memberId)
    .select("id, interests")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
