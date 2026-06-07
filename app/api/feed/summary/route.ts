import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadFeedTimeline } from "@/lib/feed-timeline";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const payload = await loadFeedTimeline(supabase, orgId);
  return NextResponse.json(payload);
}
