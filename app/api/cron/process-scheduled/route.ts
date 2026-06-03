import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processDueScheduledMessages } from "@/lib/scheduled-comms";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const result = await processDueScheduledMessages(supabase, { respectQuietHours: true });
  const now = new Date().toISOString();

  return NextResponse.json({ ...result, at: now });
}
