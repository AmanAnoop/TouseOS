import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

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
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_alumni") && !can(role, "edit_roster")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inserts: Array<{
    org_id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    graduation_year: number | null;
    pledge_class: string | null;
    city: string | null;
    state: string | null;
    career_field: string | null;
    employer: string | null;
    mentorship_interest: boolean;
    contact_preference: string;
  }> = [];

  for (const row of rows as Record<string, string>[]) {
    const fullName = row.name || row.full_name || row.Name || row["Full Name"] || "";
    if (!fullName.trim()) continue;
    const gradYear = row.graduation_year || row["Grad Year"] || row["Graduation Year"] || row.year;
    inserts.push({
      org_id: orgId,
      full_name: fullName.trim(),
      email: row.email || row.Email || null,
      phone: row.phone || row.Phone || null,
      graduation_year: gradYear ? parseInt(String(gradYear), 10) : null,
      pledge_class: row.pledge_class || row["Pledge Class"] || null,
      city: row.city || row.City || null,
      state: row.state || row.State || null,
      career_field: row.career_field || row["Career Field"] || row.career || null,
      employer: row.employer || row.Employer || row.company || null,
      mentorship_interest: ["yes", "true", "1", "y"].includes(
        String(row.mentorship || row["Mentorship Interest"] || "").toLowerCase(),
      ),
      contact_preference: row.contact_preference || row["Contact Preference"] || "email",
    });
  }

  if (!inserts.length) {
    return NextResponse.json({ error: "No valid rows found — need at least a name column" }, { status: 400 });
  }

  const { data, error } = await supabase.from("alumni_profiles").insert(inserts).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "alumni_csv_import",
    resource_type: "alumni_profiles",
    metadata: { count: data?.length ?? 0 },
  });

  return NextResponse.json({ imported: data?.length ?? 0 });
}
