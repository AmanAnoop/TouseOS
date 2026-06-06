import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, title, description, content, isRequired, orderIndex } = await request.json();
  if (!orgId || !title) return NextResponse.json({ error: "orgId and title required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_nme") && !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.from("nme_modules").insert({
    org_id: orgId,
    title: String(title).trim(),
    description: description || null,
    content: content || null,
    is_required: isRequired ?? true,
    order_index: orderIndex ?? 0,
    quiz_questions: [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, title, description, content, isRequired, orderIndex } = await request.json();
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_nme") && !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (description !== undefined) updates.description = description || null;
  if (content !== undefined) updates.content = content || null;
  if (isRequired !== undefined) updates.is_required = Boolean(isRequired);
  if (orderIndex !== undefined) updates.order_index = Number(orderIndex);

  const { data, error } = await supabase
    .from("nme_modules")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const orgId = searchParams.get("org_id");
  if (!id || !orgId) return NextResponse.json({ error: "id and org_id required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_nme") && !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("nme_modules").delete().eq("id", id).eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
