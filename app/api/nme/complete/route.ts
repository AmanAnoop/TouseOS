import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId, orgId, score } = await request.json();
  if (!moduleId || !orgId) {
    return NextResponse.json({ error: "moduleId and orgId required" }, { status: 400 });
  }

  const { data: member } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Member profile not found" }, { status: 403 });

  const { data, error } = await supabase
    .from("nme_progress")
    .upsert(
      {
        org_id: orgId,
        member_id: member.id,
        module_id: moduleId,
        completed: true,
        score: score ?? 100,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "member_id,module_id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
