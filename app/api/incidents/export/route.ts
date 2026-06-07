import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership || !can(String(membership.role) as RoleName, "manage_incidents")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("incident_reports")
    .select("id, severity, status, description, report_type, is_anonymous, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const header = "id,severity,status,report_type,is_anonymous,created_at,description\n";
  const csv = header + rows.map((r) => {
    const desc = String(r.description ?? "").replace(/"/g, '""').replace(/\n/g, " ");
    return [
      r.id,
      r.severity,
      r.status,
      r.report_type ?? "",
      r.is_anonymous ? "yes" : "no",
      r.created_at,
      `"${desc}"`,
    ].join(",");
  }).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="incidents-${orgId.slice(0, 8)}.csv"`,
    },
  });
}
