import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { getProductId } from "@/lib/org-product";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { tripId } = await params;
  const body = await request.json();
  const { orgId, playerCount, subsidy, lineItems } = body as {
    orgId: string;
    playerCount: number;
    subsidy: number;
    lineItems: Array<{ category: string; amount: number; description?: string }>;
  };

  if (!orgId || !Array.isArray(lineItems)) {
    return NextResponse.json({ error: "orgId and lineItems required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(type)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(m?.role ?? "general_member") as RoleName;
  const orgType = String(((m?.organizations as unknown) as Record<string, unknown>)?.type ?? "");
  if (getProductId(orgType) !== "sports" || !can(role, "manage_travel")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase.from("sports_trip_costs").delete().eq("trip_id", tripId);

  const rows = lineItems
    .filter((l) => Number(l.amount) > 0)
    .map((l) => ({
      trip_id: tripId,
      category: l.category,
      description: l.description ?? null,
      amount: Number(l.amount),
      subsidy: l.category === "_subsidy" ? Number(subsidy) : 0,
    }));

  if (rows.length > 0) {
    const { error: insertErr } = await supabase.from("sports_trip_costs").insert(rows);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const totalCost = lineItems.reduce((s, l) => s + Number(l.amount || 0), 0);
  const net = Math.max(0, totalCost - Number(subsidy || 0));
  const perPlayer = playerCount > 0 ? net / playerCount : 0;

  const { data: trip, error } = await supabase
    .from("sports_travel_trips")
    .update({
      total_cost: net,
      cost_per_player: perPlayer,
      subsidy: Number(subsidy || 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tripId)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ trip, totalCost, net, perPlayer });
}
