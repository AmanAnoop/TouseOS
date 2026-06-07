import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { tagsWithType } from "@/lib/task-config";
import { insertTaskRow } from "@/lib/tasks-db";
import { triggerBudgetSyncForOrg } from "@/lib/budget-auto-sync";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const officerRoles = ["owner", "president", "treasurer", "vice_president", "advisor"];
  if (!membership || !officerRoles.includes(String(membership.role))) {
    return NextResponse.json({ error: "Treasurer or president access required" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("hardship_requests")
    .select("*, member_profiles(full_name, email)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (data ?? []).map(async (row) => {
      const mp = row.member_profiles as { full_name?: string; email?: string } | null;
      if (mp?.full_name) return row;
      if (row.submitter_name) {
        return {
          ...row,
          member_profiles: { full_name: String(row.submitter_name), email: mp?.email ?? "" },
        };
      }
      if (row.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", row.user_id)
          .maybeSingle();
        if (prof?.full_name) {
          return {
            ...row,
            member_profiles: { full_name: prof.full_name, email: mp?.email ?? "" },
          };
        }
      }
      return row;
    }),
  );

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId,
    requestedAmount,
    arrangement,
    reason,
    additionalContext,
    planInstallments,
  } = body;

  if (!orgId || !reason) {
    return NextResponse.json({ error: "orgId and reason required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("id, full_name")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const memberName = profile?.full_name ?? "Member";

  const { data: requestRow, error } = await supabase
    .from("hardship_requests")
    .insert({
      org_id: orgId,
      member_id: profile?.id ?? null,
      user_id: user.id,
      submitter_name: memberName,
      requested_amount: requestedAmount != null ? Number(requestedAmount) : null,
      arrangement: arrangement ?? "waiver",
      reason,
      additional_context: additionalContext || null,
      plan_installments: planInstallments != null ? Number(planInstallments) : null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await insertTaskRow(supabase, {
    org_id: orgId,
    created_by: user.id,
    title: `Hardship request — ${memberName}`,
    description: `Member: ${memberName}\nRequested arrangement: ${arrangement}\nAmount: $${requestedAmount ?? "—"}\nReason: ${reason}\n\n${additionalContext ?? ""}`,
    priority: "high",
    status: "todo",
    tags: tagsWithType(["hardship", "dues", "treasurer"], "financial"),
  });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "hardship_request_submitted",
    resource_type: "hardship_requests",
    resource_id: requestRow.id,
    metadata: { arrangement, reason: String(reason).slice(0, 100) },
  });

  return NextResponse.json(requestRow, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, status, approvedAmount } = await request.json();
  if (!id || !orgId || !["approved", "denied"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("hardship_requests")
    .select("*, member_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  const { data, error } = await supabase
    .from("hardship_requests")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      approved_amount: status === "approved" && approvedAmount != null ? Number(approvedAmount) : null,
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "approved" && existing?.member_id && approvedAmount != null) {
    const newAmount = Math.max(0, Number(approvedAmount));
    const { data: memberPayments } = await supabase
      .from("payments")
      .select("id, amount, paid_amount")
      .eq("org_id", orgId)
      .eq("member_id", existing.member_id)
      .in("status", ["pending", "overdue", "partial"]);

    for (const p of memberPayments ?? []) {
      const paid = Number(p.paid_amount ?? 0);
      const adjusted = Math.max(paid, newAmount);
      await supabase
        .from("payments")
        .update({ amount: adjusted })
        .eq("id", p.id);
    }
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: `hardship_${status}`,
    resource_type: "hardship_requests",
    resource_id: id,
  });

  if (status === "approved") {
    void triggerBudgetSyncForOrg(orgId, user.id);
  }

  return NextResponse.json({ success: true, request: data });
}
