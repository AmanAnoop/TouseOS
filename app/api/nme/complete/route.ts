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

  const { data: module } = await supabase
    .from("nme_modules")
    .select("id, quiz_questions, order_index, is_required")
    .eq("id", moduleId)
    .eq("org_id", orgId)
    .single();

  if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const quiz = (module.quiz_questions ?? []) as unknown[];
  const submittedScore = Number(score ?? 0);
  if (quiz.length > 0 && submittedScore < 80) {
    return NextResponse.json({ error: "Quiz score must be at least 80% to pass" }, { status: 400 });
  }

  if (module.is_required) {
    const { data: priorModules } = await supabase
      .from("nme_modules")
      .select("id, order_index")
      .eq("org_id", orgId)
      .eq("is_required", true)
      .lt("order_index", module.order_index ?? 0);

    const priorIds = (priorModules ?? []).map((m) => m.id);
    if (priorIds.length > 0) {
      const { data: priorDone } = await supabase
        .from("nme_progress")
        .select("module_id")
        .eq("member_id", member.id)
        .eq("completed", true)
        .in("module_id", priorIds);
      if ((priorDone ?? []).length < priorIds.length) {
        return NextResponse.json({ error: "Complete earlier required modules first" }, { status: 400 });
      }
    }
  }

  const { data, error } = await supabase
    .from("nme_progress")
    .upsert(
      {
        org_id: orgId,
        member_id: member.id,
        module_id: moduleId,
        completed: true,
        score: quiz.length > 0 ? submittedScore : (score ?? 100),
        completed_at: new Date().toISOString(),
      },
      { onConflict: "member_id,module_id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
