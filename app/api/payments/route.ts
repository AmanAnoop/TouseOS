import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, title, amount, category, dueDate } = await request.json();

  // Create payment item
  const { data: item, error: itemError } = await supabase.from("payment_items").insert({
    org_id: orgId,
    title,
    amount: parseFloat(amount),
    category: category ?? "dues",
    due_date: dueDate || null,
  }).select().single();

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  // Assign to all active members
  const { data: members } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("membership_status", "active");

  if (members && members.length > 0) {
    const rows = members.map((m) => ({
      org_id: orgId,
      member_id: m.id,
      payment_item_id: item.id,
      amount: parseFloat(amount),
      paid_amount: 0,
      status: "pending",
      due_date: dueDate || null,
    }));

    const { error: insertError } = await supabase.from("payments").insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "charge_created",
    resource_type: "payment_items",
    resource_id: item.id,
    metadata: { title, amount, category, members_charged: members?.length ?? 0 },
  });

  return NextResponse.json({ success: true, item, membersCharged: members?.length ?? 0 }, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("payments")
    .select("*, member_profiles(full_name, email, profile_photo_url)")
    .eq("org_id", orgId)
    .order("due_date");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
