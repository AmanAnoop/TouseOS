import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const supabase = getServiceClient();
  const { data: orgs } = await supabase.from("organizations").select("id").limit(500);

  let reminded = 0;
  for (const org of orgs ?? []) {
    try {
      const res = await fetch(`${baseUrl}/api/forms/remind`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
        body: JSON.stringify({ orgId: org.id }),
      });
      if (res.ok) {
        const data = await res.json();
        reminded += Number(data.notified ?? data.reminded ?? 0);
      }
    } catch {
      // skip org on failure
    }
  }

  return NextResponse.json({ reminded, orgsScanned: orgs?.length ?? 0, at: new Date().toISOString() });
}
