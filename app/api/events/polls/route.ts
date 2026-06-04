import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

async function roleForOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string,
): Promise<RoleName> {
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .maybeSingle();
  return String(data?.role ?? "general_member") as RoleName;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(request.url).searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("event_polls")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId, orgId, question, options } = await request.json();
  if (!eventId || !orgId || !question?.trim()) {
    return NextResponse.json({ error: "eventId, orgId, and question required" }, { status: 400 });
  }

  const role = await roleForOrg(supabase, user.id, orgId);
  if (!can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const opts = Array.isArray(options)
    ? options.map((o: string) => String(o).trim()).filter(Boolean)
    : [];
  if (opts.length < 2) {
    return NextResponse.json({ error: "At least two options required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("event_polls")
    .insert({
      event_id: eventId,
      question: question.trim(),
      options: opts,
      votes: {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pollId, optionIndex } = await request.json();
  if (!pollId || optionIndex == null) {
    return NextResponse.json({ error: "pollId and optionIndex required" }, { status: 400 });
  }

  const { data: poll } = await supabase.from("event_polls").select("*").eq("id", pollId).single();
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  const { data: event } = await supabase.from("events").select("org_id").eq("id", poll.event_id).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", event.org_id)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const votes = (poll.votes ?? {}) as Record<string, number>;
  const key = String(optionIndex);
  votes[key] = (votes[key] ?? 0) + 1;

  const { data, error } = await supabase
    .from("event_polls")
    .update({ votes })
    .eq("id", pollId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
