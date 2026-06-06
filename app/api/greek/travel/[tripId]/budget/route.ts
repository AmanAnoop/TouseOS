import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;
  const { orgId, category, description, estCost, actualCost, paidBy, reimbursementStatus } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

  const { data: trip } = await supabase
    .from("greek_travel_trips")
    .select("id")
    .eq("id", tripId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("greek_trip_budget_items")
    .insert({
      trip_id: tripId,
      category,
      description: description || null,
      est_cost: estCost ?? 0,
      actual_cost: actualCost ?? 0,
      paid_by: paidBy || null,
      reimbursement_status: reimbursementStatus || "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
