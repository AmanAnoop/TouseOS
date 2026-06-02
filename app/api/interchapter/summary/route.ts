import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [proposalsRes, ideasRes] = await Promise.all([
    supabase
      .from("interchapter_proposals")
      .select("id, status, proposing_org_id, target_org_id, budget_estimate")
      .or(`proposing_org_id.eq.${orgId},target_org_id.eq.${orgId}`),
    supabase.from("interchapter_ideas").select("id, upvotes, risk_level").eq("org_id", orgId),
  ]);

  const proposals = proposalsRes.data ?? [];
  const ideas = ideasRes.data ?? [];

  const byStatus: Record<string, number> = {};
  for (const p of proposals) {
    const s = String(p.status ?? "pending");
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const outgoing = proposals.filter((p) => p.proposing_org_id === orgId).length;
  const incoming = proposals.filter((p) => p.target_org_id === orgId).length;
  const budgetTotal = proposals.reduce(
    (sum, p) => sum + (Number(p.budget_estimate) || 0),
    0,
  );

  return NextResponse.json({
    proposals: {
      total: proposals.length,
      outgoing,
      incoming,
      byStatus,
      budgetTotal,
    },
    ideas: {
      total: ideas.length,
      totalUpvotes: ideas.reduce((s, i) => s + (Number(i.upvotes) || 0), 0),
      highRisk: ideas.filter((i) => i.risk_level === "high").length,
    },
  });
}
