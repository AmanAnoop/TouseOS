import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;
  const { orgId, label, assignedTo, dueDate, itemId, complete, action } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  if (action === "toggle" && itemId) {
    const { data: item } = await supabase
      .from("greek_trip_checklist_items")
      .select("complete")
      .eq("id", itemId)
      .maybeSingle();
    const { data, error } = await supabase
      .from("greek_trip_checklist_items")
      .update({ complete: !item?.complete })
      .eq("id", itemId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === "mark_all_complete") {
    const { error } = await supabase
      .from("greek_trip_checklist_items")
      .update({ complete: true })
      .eq("trip_id", tripId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });

  const { count } = await supabase
    .from("greek_trip_checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  const { data, error } = await supabase
    .from("greek_trip_checklist_items")
    .insert({
      trip_id: tripId,
      label,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      complete: Boolean(complete),
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
