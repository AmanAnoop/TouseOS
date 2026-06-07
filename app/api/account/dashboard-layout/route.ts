import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeDashboardLayout, type DashboardLayoutPrefs } from "@/lib/dashboard-layout";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("dashboard_layout")
    .eq("id", user.id)
    .single();

  if (error || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({
    layout: normalizeDashboardLayout(profile.dashboard_layout, orgId),
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const orgId = String(body.orgId ?? "");
  const layout = body.layout as DashboardLayoutPrefs | undefined;
  if (!orgId || !layout?.order) {
    return NextResponse.json({ error: "orgId and layout.order required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("dashboard_layout")
    .eq("id", user.id)
    .single();

  const current = profile?.dashboard_layout && typeof profile.dashboard_layout === "object"
    ? { ...(profile.dashboard_layout as Record<string, unknown>) }
    : {};

  current[orgId] = {
    order: layout.order,
    hidden: layout.hidden ?? [],
  };

  const { data, error } = await supabase
    .from("profiles")
    .update({ dashboard_layout: current })
    .eq("id", user.id)
    .select("dashboard_layout")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    layout: normalizeDashboardLayout(data.dashboard_layout, orgId),
  });
}
