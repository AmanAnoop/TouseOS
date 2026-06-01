import type { SupabaseClient } from "@supabase/supabase-js";

export interface PaymentCheckoutRow {
  id: string;
  org_id: string;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  late_fee: number;
  payment_items?: { title: string } | { title: string }[] | null;
  member_profiles?: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  organizations?: { name: string } | { name: string }[] | null;
}

export function paymentItemTitle(row: PaymentCheckoutRow): string {
  const item = row.payment_items;
  if (!item) return "Chapter payment";
  if (Array.isArray(item)) return item[0]?.title ?? "Chapter payment";
  return item.title ?? "Chapter payment";
}

export function orgNameFromPayment(row: PaymentCheckoutRow): string {
  const org = row.organizations;
  if (!org) return "Chapter";
  if (Array.isArray(org)) return org[0]?.name ?? "Chapter";
  return org.name ?? "Chapter";
}

export function memberEmailFromPayment(row: PaymentCheckoutRow): string | undefined {
  const mp = row.member_profiles;
  if (!mp) return undefined;
  if (Array.isArray(mp)) return mp[0]?.email;
  return mp.email;
}

export function computeCheckoutAmount(row: PaymentCheckoutRow): number {
  const remaining = Math.max(0, Number(row.amount) - Number(row.paid_amount));
  const duePast = row.due_date && new Date(row.due_date) < new Date();
  const applyLateFee =
    row.status === "overdue" || duePast || row.status === "partial";
  const lateFee = applyLateFee ? Number(row.late_fee ?? 0) : 0;
  return Math.round((remaining + lateFee) * 100) / 100;
}

export async function loadPaymentForCheckout(
  supabase: SupabaseClient,
  paymentId: string,
  parentToken?: string,
) {
  let query = supabase
    .from("payments")
    .select("*, payment_items(title), member_profiles(full_name, email), organizations(name)")
    .eq("id", paymentId);

  if (parentToken) {
    query = query.eq("parent_pay_token", parentToken);
  }

  return query.single();
}
