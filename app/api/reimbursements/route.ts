import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";
import { can, type RoleName } from "@/lib/permissions";
import {
  buildReimbursementUpdates,
  type ReimbursementApprovalInput,
} from "@/lib/reimbursement-approval";

const PRESIDENT_ROLES: RoleName[] = ["owner", "president"];

async function membershipForOrg(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, orgId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

function canReviewReimbursements(role: RoleName): boolean {
  return can(role, "manage_payments") || can(role, "manage_budget");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await membershipForOrg(supabase, user.id, orgId);
  if (!can(role, "view_payments") && !can(role, "manage_payments") && !can(role, "manage_budget")) {
    const { data: own } = await supabase
      .from("reimbursements")
      .select("*")
      .eq("org_id", orgId)
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });
    return NextResponse.json(own ?? []);
  }

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
  if (!orgId || amount == null || !category || !description) {
    return NextResponse.json({ error: "orgId, amount, category, and description required" }, { status: 400 });
  }

  const role = await membershipForOrg(supabase, user.id, orgId);
  if (!can(role, "view_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { data, error } = await supabase.from("reimbursements").insert({
    org_id: orgId,
    submitted_by: user.id,
    submitted_by_name: profile?.full_name ?? null,
    event_id: eventId || null,
    amount: parseFloat(String(amount)),
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

  const body = await request.json();
  const { id, status, rejectionReason, approvalType } = body as {
    id: string;
    status?: string;
    rejectionReason?: string;
    approvalType?: "treasurer" | "president";
  };

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing, error: fetchErr } = await supabase
    .from("reimbursements")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Reimbursement not found" }, { status: 404 });
  }

  const orgId = String(existing.org_id);
  const role = await membershipForOrg(supabase, user.id, orgId);

  if (String(existing.submitted_by) === user.id && !approvalType && !status) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const isOfficerAction = Boolean(approvalType || (status && status !== "submitted"));
  if (isOfficerAction && !canReviewReimbursements(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (approvalType === "president" && !PRESIDENT_ROLES.includes(role)) {
    return NextResponse.json({ error: "President approval requires president or owner role" }, { status: 403 });
  }

  const input: ReimbursementApprovalInput = { status, rejectionReason, approvalType };
  const { updates, toastMessage } = buildReimbursementUpdates(existing, input, user.id);

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reimbursements")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const newStatus = String(data.status);
  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: approvalType
      ? `reimbursement_${approvalType}_approved`
      : `reimbursement_${newStatus}`,
    resource_type: "reimbursements",
    resource_id: id,
    metadata: { approvalType, status: newStatus },
  });

  if (newStatus === "paid" || newStatus === "approved") {
    void triggerBudgetSyncForOrg(orgId, user.id);
  }

  return NextResponse.json({ ...data, message: toastMessage });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const orgId = searchParams.get("org_id");
  if (!id || !orgId) return NextResponse.json({ error: "id and org_id required" }, { status: 400 });

  const role = await membershipForOrg(supabase, user.id, orgId);
  if (!canReviewReimbursements(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("reimbursements")
    .select("id, org_id, status")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Reimbursement not found" }, { status: 404 });

  const { error } = await supabase.from("reimbursements").delete().eq("id", id).eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "reimbursement_deleted",
    resource_type: "reimbursements",
    resource_id: id,
    metadata: { status: existing.status },
  });

  void triggerBudgetSyncForOrg(orgId, user.id);
  return NextResponse.json({ success: true });
}
