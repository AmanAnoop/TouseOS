import { NextResponse } from "next/server";
import {
  canViewReimbursementReceipt,
  createReceiptSignedUrl,
  receiptStoragePathFromUrl,
} from "@/lib/receipt-access";
import type { RoleName } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const reimbursementId = searchParams.get("reimbursement_id");
  const orgId = searchParams.get("org_id");
  if (!reimbursementId || !orgId) {
    return NextResponse.json({ error: "reimbursement_id and org_id required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const role = String(membership.role ?? "general_member") as RoleName;
  if (!canViewReimbursementReceipt(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: reimb, error: reimbErr } = await supabase
    .from("reimbursements")
    .select("id, org_id, receipt_url, member_id")
    .eq("id", reimbursementId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (reimbErr || !reimb) {
    return NextResponse.json({ error: "Reimbursement not found" }, { status: 404 });
  }

  if (!reimb.receipt_url) {
    return NextResponse.json({ error: "No receipt uploaded" }, { status: 400 });
  }

  const storagePath = receiptStoragePathFromUrl(String(reimb.receipt_url));
  if (!storagePath) {
    return NextResponse.json({ url: reimb.receipt_url, legacy: true });
  }

  const signed = await createReceiptSignedUrl(supabase, storagePath);
  if ("error" in signed) {
    return NextResponse.json({ error: signed.error }, { status: 500 });
  }

  return NextResponse.json({ url: signed.url, expiresIn: 3600 });
}
