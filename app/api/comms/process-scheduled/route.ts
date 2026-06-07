import { NextResponse } from "next/server";
import { processDueScheduledMessages } from "@/lib/scheduled-comms";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await processDueScheduledMessages(supabase, { respectQuietHours: true });

  return NextResponse.json(result);
}
