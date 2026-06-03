import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAssigneeUserId } from "@/lib/task-assignee";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("org_id", orgId)
    .neq("status", "cancelled")
    .order("priority")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, title, description, priority, dueDate, assigneeName, tags, isRecurring } = body;
  if (!orgId || !title?.trim()) {
    return NextResponse.json({ error: "orgId and title required" }, { status: 400 });
  }

  const assignedTo = await resolveAssigneeUserId(supabase, orgId, assigneeName);

  const { data, error } = await supabase.from("tasks").insert({
    org_id: orgId,
    created_by: user.id,
    title: title.trim(),
    description: description || null,
    priority: priority ?? "medium",
    due_date: dueDate || null,
    assignee_name: assigneeName || null,
    assigned_to: assignedTo,
    status: "todo",
    tags: tags ?? [],
    is_recurring: Boolean(isRecurring),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, status, assignee_name: assigneeName, org_id: orgIdFromBody, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing } = await supabase.from("tasks").select("org_id").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const orgId = orgIdFromBody ?? existing.org_id;
  const updates: Record<string, unknown> = { ...rest };
  if (status) {
    updates.status = status;
    if (status === "done") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
  }
  if (assigneeName !== undefined) {
    updates.assignee_name = assigneeName || null;
    updates.assigned_to = await resolveAssigneeUserId(supabase, orgId, assigneeName);
  }

  const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: messageFrom(error) }, { status: 500 });
  return NextResponse.json({ success: true });
}

function messageFrom(error: { message: string }) {
  return error.message;
}
