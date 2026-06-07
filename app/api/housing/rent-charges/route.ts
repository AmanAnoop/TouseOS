import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHousingRentCharges } from "@/lib/housing-rent";

/** Create monthly rent payment charges for all active housing assignments. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, dueDate, monthLabel } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const result = await createHousingRentCharges(supabase, orgId, {
    dueDate,
    monthLabel,
    actorId: user.id,
  });

  if (result.created === 0 && result.skipped === 0 && result.message.includes("No rooms")) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.created === 0 && result.skipped === 0 && result.message.includes("No active")) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    created: result.created,
    skipped: result.skipped,
    failed: result.failed,
    message: result.created > 0
      ? `${result.message} Collected rent appears under Housing & rent on Budget.`
      : result.message,
  });
}
