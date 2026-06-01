import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId, orgId, lateFee } = await request.json();
  if (!paymentId || !orgId) {
    return NextResponse.json({ error: "paymentId and orgId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_payments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fee = Math.max(0, parseFloat(String(lateFee ?? 0)));
  const { data, error } = await supabase
    .from("payments")
    .update({ late_fee: fee })
    .eq("id", paymentId)
    .eq("org_id", orgId)
    .select("id, late_fee")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, payment: data });
}
