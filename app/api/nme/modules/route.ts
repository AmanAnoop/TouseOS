import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: om } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!om) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: member } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const [modulesRes, progressRes] = await Promise.all([
    supabase.from("nme_modules").select("*").eq("org_id", orgId).order("order_index", { ascending: true }),
    member
      ? supabase.from("nme_progress").select("*").eq("member_id", member.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (modulesRes.error) {
    return NextResponse.json({ error: modulesRes.error.message }, { status: 500 });
  }

  const progress = progressRes.data ?? [];
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => String(p.module_id)));

  const modules = modulesRes.data ?? [];
  const required = modules.filter((m) => m.is_required);
  const requiredComplete = required.filter((m) => completedIds.has(String(m.id))).length;

  return NextResponse.json({
    modules,
    progress,
    completedModuleIds: Array.from(completedIds),
    requiredTotal: required.length,
    requiredComplete,
    allRequiredDone: required.length === 0 || requiredComplete >= required.length,
  });
}
