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
    .from("governance_votes")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    voteId,
    option,
    action,
    orgId,
    title,
    options: optionsInput,
    voterGroup,
    deadline,
  } = body;

  if (!voteId && orgId && title) {
    const opts = Array.isArray(optionsInput)
      ? optionsInput
      : String(optionsInput ?? "Yes, No, Abstain").split(",").map((s: string) => s.trim()).filter(Boolean);
    const insert: Record<string, unknown> = {
      org_id: orgId,
      title,
      description: null,
      status: "open",
      options: opts.length ? opts : ["Yes", "No"],
      votes: {},
      voter_group: voterGroup || "all_members",
      deadline: deadline || null,
    };
    const { data, error } = await supabase
      .from("governance_votes")
      .insert(insert)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  if (!voteId) return NextResponse.json({ error: "voteId required" }, { status: 400 });

  const { data: vote } = await supabase.from("governance_votes").select("*").eq("id", voteId).single();
  if (!vote) return NextResponse.json({ error: "Vote not found" }, { status: 404 });

  if (action === "close") {
    const { data, error } = await supabase
      .from("governance_votes")
      .update({ status: "closed" })
      .eq("id", voteId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (!option) return NextResponse.json({ error: "option required" }, { status: 400 });
  if (vote.status !== "open") return NextResponse.json({ error: "Vote is closed" }, { status: 400 });
  if (vote.deadline && new Date(vote.deadline) < new Date()) {
    await supabase.from("governance_votes").update({ status: "closed" }).eq("id", voteId);
    return NextResponse.json({ error: "Voting deadline has passed" }, { status: 400 });
  }

  const voteOptions = (vote.options as string[]) ?? ["Yes", "No", "Abstain"];
  if (!voteOptions.includes(option)) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  const ballots = (vote.votes as Record<string, string>) ?? {};
  ballots[user.id] = option;

  const { data, error } = await supabase
    .from("governance_votes")
    .update({ votes: ballots })
    .eq("id", voteId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
