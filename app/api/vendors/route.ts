import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("org_id", orgId)
    .order("category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId, name, category, contactName, contactEmail, contactPhone,
    website, notes, cancellationPolicy, insuranceRequired, reliabilityRating,
    wouldUseAgain,
  } = body;

  const { data, error } = await supabase.from("vendors").insert({
    org_id: orgId,
    name,
    category,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    website: website || null,
    notes: notes || null,
    cancellation_policy: cancellationPolicy || null,
    insurance_required: insuranceRequired ?? false,
    reliability_rating: reliabilityRating ?? null,
    would_use_again: wouldUseAgain ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await request.json();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.reliabilityRating !== undefined) dbUpdates.reliability_rating = updates.reliabilityRating;
  if (updates.wouldUseAgain !== undefined) dbUpdates.would_use_again = updates.wouldUseAgain;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.totalSpent !== undefined) dbUpdates.total_spent = updates.totalSpent;

  const { data, error } = await supabase.from("vendors").update(dbUpdates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
