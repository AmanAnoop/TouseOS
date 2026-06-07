import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEventIcs } from "@/lib/event-ics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, description, location, address, starts_at, ends_at, org_id, organizations(name)")
    .eq("id", id)
    .single();

  if (error || !event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", event.org_id)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgRow = event.organizations as { name?: string } | null;
  const ics = buildEventIcs({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    address: event.address,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    orgName: orgRow?.name ?? null,
  });

  const filename = `${event.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.ics`;

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
