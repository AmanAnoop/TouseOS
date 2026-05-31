import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, rows } = await request.json();
  if (!orgId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "orgId and rows required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "president", "vice_president", "secretary"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const inserts = rows.map((row: Record<string, string>) => ({
    org_id: orgId,
    full_name: row.name || row.full_name || row.Name || "Unknown",
    email: row.email || row.Email || `${Date.now()}@import.local`,
    phone: row.phone || row.Phone || null,
    class_year: row.class_year || row["Class Year"] || row.class || null,
    major: row.major || row.Major || null,
    hometown: row.hometown || row.Hometown || null,
    graduation_year: row.graduation_year ? parseInt(String(row.graduation_year), 10) : null,
    role: row.role || "general_member",
    membership_status: row.status || row.Status || "active",
  }));

  const { data, error } = await supabase.from("member_profiles").insert(inserts).select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "roster_csv_import",
    resource_type: "member_profiles",
    metadata: { count: data?.length ?? 0 },
  });

  return NextResponse.json({ imported: data?.length ?? 0 });
}
