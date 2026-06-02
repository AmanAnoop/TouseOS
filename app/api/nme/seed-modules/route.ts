import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

const DEFAULT_MODULES = [
  { title: "Anti-hazing acknowledgement", description: "Read and sign the anti-hazing policy", is_required: true, order_index: 0 },
  { title: "Chapter values & history", description: "Learn founding principles and chapter history", is_required: true, order_index: 1 },
  { title: "Risk management overview", description: "Chapter risk policies and procedures", is_required: true, order_index: 2 },
  { title: "Member responsibilities", description: "Dues, attendance, and officer roles", is_required: true, order_index: 3 },
  { title: "Financial policies", description: "How dues and chapter finances work", is_required: true, order_index: 4 },
  { title: "Social media guidelines", description: "Brand standards and content policies", is_required: false, order_index: 5 },
  { title: "Big/little program intro", description: "How matching works", is_required: false, order_index: 6 },
  { title: "Community values quiz", description: "Test knowledge of chapter values", is_required: true, order_index: 7 },
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_nme") && !can(role, "manage_org_settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await supabase
    .from("nme_modules")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ message: "Modules already exist", seeded: 0 });
  }

  const rows = DEFAULT_MODULES.map((m) => ({ org_id: orgId, ...m }));
  const { error } = await supabase.from("nme_modules").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, seeded: rows.length });
}
