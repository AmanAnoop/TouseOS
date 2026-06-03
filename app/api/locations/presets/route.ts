import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const kind = searchParams.get("kind") ?? "event";
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let query = supabase
    .from("org_location_presets")
    .select("*")
    .eq("org_id", orgId)
    .order("label");
  if (kind === "event" || kind === "travel") {
    query = query.eq("preset_kind", kind);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId,
    label,
    presetKind = "event",
    venueName,
    address,
    destination,
    departureLocation,
    meetingPoint,
  } = body;
  if (!orgId || !label?.trim()) {
    return NextResponse.json({ error: "orgId and label required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("org_location_presets")
    .insert({
      org_id: orgId,
      label: String(label).trim(),
      preset_kind: presetKind === "travel" ? "travel" : "event",
      venue_name: venueName?.trim() || null,
      address: address?.trim() || null,
      destination: destination?.trim() || null,
      departure_location: departureLocation?.trim() || null,
      meeting_point: meetingPoint?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
