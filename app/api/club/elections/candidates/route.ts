import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, electionId, memberId, displayName, statement } = await request.json();

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  if (getProductId(String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "")) !== "club" || !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("club_election_candidates")
    .insert({
      org_id: orgId,
      election_id: electionId,
      member_id: memberId || null,
      display_name: displayName,
      statement: statement || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
