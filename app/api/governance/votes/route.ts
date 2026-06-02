import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { voteId, option, action } = await request.json();
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

  const options = (vote.options as string[]) ?? ["Yes", "No", "Abstain"];
  if (!options.includes(option)) {
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
