import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

function parseFeatureFlags(): Record<string, boolean> {
  const raw = process.env.PLATFORM_FEATURE_FLAGS ?? "";
  if (!raw.trim()) {
    return {
      greekmatch: true,
      interchapter: true,
      ai_assistant: true,
      stripe_payments: true,
    };
  }
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return { parse_error: true };
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = await createServiceClient();
  const [orgsRes, membersRes, eventsRes, donationsRes, profilesRes, paymentsRes] = await Promise.all([
    service.from("organizations").select("id", { count: "exact", head: true }),
    service.from("member_profiles").select("id", { count: "exact", head: true }),
    service.from("events").select("id", { count: "exact", head: true }),
    service.from("donations").select("amount"),
    service.from("profiles").select("id", { count: "exact", head: true }),
    service.from("payments").select("amount, status").eq("status", "paid"),
  ]);

  const totalDonations = (donationsRes.data ?? []).reduce(
    (s, d) => s + Number(d.amount ?? 0),
    0,
  );

  const paymentsVolume = (paymentsRes.data ?? []).reduce(
    (s, p) => s + Number(p.amount ?? 0),
    0,
  );

  return NextResponse.json({
    counts: {
      organizations: orgsRes.count ?? 0,
      members: membersRes.count ?? 0,
      events: eventsRes.count ?? 0,
      users: profilesRes.count ?? 0,
    },
    donationsRaised: totalDonations,
    paymentsVolume,
    featureFlags: parseFeatureFlags(),
  });
}
