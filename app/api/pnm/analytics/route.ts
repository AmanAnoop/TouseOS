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

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "view_recruitment") && !can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: leads } = await supabase
    .from("pnm_leads")
    .select("id, status, campaign, referral_source, communication_consent, profile_enriched_at, created_at")
    .eq("org_id", orgId);

  const rows = leads ?? [];
  const byCampaign: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let enriched = 0;
  let consented = 0;
  let instagramLeads = 0;

  for (const row of rows) {
    const campaign = row.campaign || "organic";
    byCampaign[campaign] = (byCampaign[campaign] ?? 0) + 1;
    if (campaign.toLowerCase().includes("instagram") || row.referral_source?.toLowerCase().includes("instagram")) {
      instagramLeads++;
    }
    const source = row.referral_source || "unknown";
    bySource[source] = (bySource[source] ?? 0) + 1;
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    if (row.profile_enriched_at) enriched++;
    if (row.communication_consent) consented++;
  }

  const pipeline = Object.entries(byStatus)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const campaigns = Object.entries(byCampaign)
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count);

  const sources = Object.entries(bySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    total: rows.length,
    enriched,
    consented,
    instagramLeads,
    pipeline,
    campaigns,
    sources,
  });
}
