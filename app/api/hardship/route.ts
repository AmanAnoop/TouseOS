import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("hardship_requests")
    .select("*, member_profiles(full_name, email)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId,
    requesterName,
    requestedAmount,
    arrangement,
    reason,
    additionalContext,
    planInstallments,
  } = body;

  if (!orgId || !reason || !requesterName?.trim()) {
    return NextResponse.json({ error: "orgId, requesterName, and reason required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: requestRow, error } = await supabase
    .from("hardship_requests")
    .insert({
      org_id: orgId,
      member_id: profile?.id ?? null,
      user_id: user.id,
      requested_amount: requestedAmount != null ? Number(requestedAmount) : null,
      arrangement: arrangement ?? "waiver",
      reason,
      additional_context: [
        `Requester: ${String(requesterName).trim()}`,
        additionalContext || "",
      ].filter(Boolean).join("\n\n"),
      plan_installments: planInstallments != null ? Number(planInstallments) : null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("tasks").insert({
    org_id: orgId,
    created_by: user.id,
    title: `Hardship request — ${arrangement ?? "waiver"}`,
    description: `Requested arrangement: ${arrangement}\nAmount: $${requestedAmount ?? "—"}\nReason: ${reason}\n\n${additionalContext ?? ""}`,
    priority: "high",
    status: "todo",
    tags: ["hardship", "dues", "treasurer"],
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

  const { data, error } = await supabase
    .from("hardship_requests")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "approved" && data.member_id) {
    const { data: openPayments } = await supabase
      .from("payments")
      .select("id, amount, paid_amount")
      .eq("org_id", orgId)
      .eq("member_id", data.member_id)
      .in("status", ["pending", "overdue", "partial"]);

    const targetAmount = approvedAmount != null
      ? Number(approvedAmount)
      : data.arrangement === "waiver"
        ? 0
        : Number(data.requested_amount ?? 0);

    for (const pay of openPayments ?? []) {
      const remaining = Math.max(0, Number(pay.amount) - Number(pay.paid_amount));
      const newAmount = Math.min(Number(pay.amount), Number(pay.paid_amount) + Math.min(remaining, targetAmount));
      if (newAmount < Number(pay.amount)) {
        await supabase.from("payments").update({ amount: newAmount }).eq("id", pay.id);
      }
    }
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: `hardship_${status}`,
    resource_type: "hardship_requests",
    resource_id: id,
  });

  return NextResponse.json({ success: true, request: data });
}
