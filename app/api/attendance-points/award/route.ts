import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardCheckInPoints } from "@/lib/attendance-points";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, memberId, eventId, eventType } = await request.json();
  if (!orgId || !memberId || !eventId || !eventType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await awardCheckInPoints({
    supabase,
    orgId,
    memberId,
    eventId,
    eventType,
    createdBy: user.id,
  });

  return NextResponse.json(result);
}
