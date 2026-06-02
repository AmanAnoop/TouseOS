export interface EventPnlRow {
  eventId: string;
  title: string;
  startsAt: string;
  income: number;
  expense: number;
  net: number;
}

export interface EventSummary {
  id: string;
  title: string;
  starts_at: string;
}

interface PaymentWithEvent {
  amount: number;
  paid_amount: number;
  status: string;
  payment_items?: { event_id: string | null; title?: string } | { event_id: string | null; title?: string }[] | null;
}

interface ReimbWithEvent {
  amount: number;
  status: string;
  event_id: string | null;
}

function itemEventId(
  item: PaymentWithEvent["payment_items"],
): string | null {
  if (!item) return null;
  if (Array.isArray(item)) return item[0]?.event_id ?? null;
  return item.event_id ?? null;
}

export function computeEventPnl(
  events: EventSummary[],
  payments: PaymentWithEvent[],
  reimbursements: ReimbWithEvent[],
): EventPnlRow[] {
  const byEvent = new Map<string, EventPnlRow>();

  for (const e of events) {
    byEvent.set(e.id, {
      eventId: e.id,
      title: e.title,
      startsAt: e.starts_at,
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  for (const p of payments) {
    const eid = itemEventId(p.payment_items);
    if (!eid) continue;
    const row = byEvent.get(eid);
    if (!row) continue;
    if (p.status === "paid" || p.status === "partial") {
      row.income += Number(p.paid_amount);
    }
  }

  for (const r of reimbursements) {
    if (!r.event_id) continue;
    const row = byEvent.get(r.event_id);
    if (!row) continue;
    if (["submitted", "approved", "paid", "needs_info"].includes(r.status)) {
      row.expense += Number(r.amount);
    }
  }

  return Array.from(byEvent.values())
    .map((r) => ({ ...r, net: r.income - r.expense }))
    .filter((r) => r.income > 0 || r.expense > 0)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
}
