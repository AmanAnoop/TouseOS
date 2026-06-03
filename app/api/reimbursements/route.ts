import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("reimbursements")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, amount, category, description, eventId, receiptUrl } = body;

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data, error } = await supabase.from("reimbursements").insert({
    org_id: orgId,
    submitted_by: user.id,
    submitted_by_name: profile?.full_name ?? null,
    event_id: eventId || null,
    amount: parseFloat(amount),
    category,
    description,
    receipt_url: receiptUrl || null,
    status: "submitted",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "reimbursement_submitted",
    resource_type: "reimbursements",
    resource_id: data.id,
    metadata: { amount, category },
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, rejectionReason } = await request.json();

  const updates: Record<string, unknown> = { status };
  if (rejectionReason) updates.rejection_reason = rejectionReason;
  if (status === "approved" || status === "needs_info") {
    updates.reviewed_by = user.id;
    updates.reviewed_at = new Date().toISOString();
  }
  if (status === "paid") updates.paid_at = new Date().toISOString();

  const { data, error } = await supabase.from("reimbursements").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgId = data?.org_id as string | undefined;
  if (orgId) {
    await supabase.from("audit_logs").insert({
      org_id: orgId,
      actor_id: user.id,
      action: `reimbursement_${status}`,
      resource_type: "reimbursements",
      resource_id: id,
    });
    if (status === "paid" || status === "approved") {
      void triggerBudgetSyncForOrg(orgId, user.id);
    }
  }

  return NextResponse.json(data);
}
