import type { SupabaseClient } from "@supabase/supabase-js";

export async function buildAiOrgContext(supabase: SupabaseClient, orgId: string): Promise<string> {
  const [
    orgRes,
    membersRes,
    eventsRes,
    tasksRes,
    paymentsRes,
    docsRes,
  ] = await Promise.all([
    supabase.from("organizations").select("name, type, campus").eq("id", orgId).single(),
    supabase.from("member_profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("membership_status", "active"),
    supabase.from("events").select("title, starts_at, type").eq("org_id", orgId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
    supabase.from("tasks").select("title, status, due_date").eq("org_id", orgId).neq("status", "done").neq("status", "cancelled").order("due_date").limit(5),
    supabase.from("payments").select("status, amount, paid_amount").eq("org_id", orgId).in("status", ["pending", "partial", "overdue"]),
    supabase.from("documents").select("title, category").eq("org_id", orgId).limit(15),
  ]);

  const org = orgRes.data;
  const activeMembers = membersRes.count ?? 0;
  const events = eventsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const docs = docsRes.data ?? [];

  const unpaidTotal = payments.reduce((s, p) => s + Number(p.amount) - Number(p.paid_amount ?? 0), 0);
  const overdueCount = payments.filter((p) => p.status === "overdue").length;

  const lines = [
    `\n\n--- Organization context ---`,
    `Name: ${org?.name ?? "Unknown"}`,
    `Type: ${org?.type ?? "org"}${org?.campus ? ` · ${org.campus}` : ""}`,
    `Active members: ${activeMembers}`,
    `Upcoming events (${events.length}): ${events.map((e) => `${e.title} (${String(e.starts_at).slice(0, 10)})`).join("; ") || "none"}`,
    `Open tasks (${tasks.length}): ${tasks.map((t) => t.title).join("; ") || "none"}`,
    `Outstanding balances: $${unpaidTotal.toFixed(2)} across ${payments.length} records (${overdueCount} overdue)`,
    docs.length ? `Documents: ${docs.map((d) => `${d.title} [${d.category}]`).join(", ")}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}
