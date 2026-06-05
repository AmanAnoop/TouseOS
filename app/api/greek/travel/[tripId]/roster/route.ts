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
  const { orgId, action, memberId, status, dietaryNotes } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  if (action === "invite_all") {
    const { data: members } = await supabase
      .from("member_profiles")
      .select("id")
      .eq("org_id", orgId)
      .eq("membership_status", "active");

    const rows = (members ?? []).map((m) => ({
      trip_id: tripId,
      member_id: m.id,
      status: "no_response",
    }));

    if (rows.length) {
      await supabase.from("greek_trip_rsvps").upsert(rows, { onConflict: "trip_id,member_id", ignoreDuplicates: true });
    }
    return NextResponse.json({ invited: rows.length });
  }

  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  if (action === "rsvp") {
    const { data, error } = await supabase
      .from("greek_trip_rsvps")
      .upsert({
        trip_id: tripId,
        member_id: memberId,
        status: status ?? "no_response",
        dietary_notes: dietaryNotes ?? null,
      }, { onConflict: "trip_id,member_id" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
