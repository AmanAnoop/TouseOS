import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, waiverType, memberId } = await request.json();
  if (!orgId || !waiverType) {
    return NextResponse.json({ error: "orgId and waiverType required" }, { status: 400 });
  }

  let targetMemberId = memberId;
  if (!targetMemberId) {
    const { data: mp } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!mp) return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
    targetMemberId = mp.id;
  } else {
    const { data: caller } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();
    const officerRoles = ["owner", "president", "vice_president", "treasurer", "secretary", "risk_manager", "captain", "coach"];
    const isSelf = await supabase
      .from("member_profiles")
      .select("id")
      .eq("id", targetMemberId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!caller || (!officerRoles.includes(caller.role) && !isSelf.data)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("sports_waivers")
    .upsert(
      {
        org_id: orgId,
        member_id: targetMemberId,
        waiver_type: waiverType,
        status: "completed",
        signed_at: new Date().toISOString(),
      },
      { onConflict: "org_id,member_id,waiver_type" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
