import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHousingRentCharges } from "@/lib/housing-rent";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials missing");
  return createClient(url, key);
}

/** Auto-post monthly housing rent for orgs with recurring rent enabled. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const today = new Date();
  const dayOfMonth = today.getDate();
  const dueDate = today.toISOString().slice(0, 10);
  const monthLabel = today.toLocaleString("en-US", { month: "long", year: "numeric" });

  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, settings");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let orgsProcessed = 0;
  let chargesCreated = 0;

  for (const org of orgs ?? []) {
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const rentCfg = (settings.housing_rent ?? {}) as Record<string, unknown>;
    if (!rentCfg.recurring_enabled) continue;

    const dueDay = Number(rentCfg.due_day ?? 1);
    if (dueDay !== dayOfMonth) continue;

    const result = await createHousingRentCharges(supabase, String(org.id), {
      dueDate,
      monthLabel,
    });

    if (result.created > 0 || result.skipped > 0) {
      orgsProcessed += 1;
      chargesCreated += result.created;
    }
  }

  return NextResponse.json({
    orgsProcessed,
    chargesCreated,
    dayOfMonth,
    at: new Date().toISOString(),
  });
}
