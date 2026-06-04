import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Greek orgs on platform for proposal target picker */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const excludeOrgId = new URL(request.url).searchParams.get("exclude_org_id");

  let query = supabase
    .from("organizations")
    .select("id, name, type, campus")
    .in("type", ["fraternity", "sorority"])
    .order("name")
    .limit(40);

  if (excludeOrgId) query = query.neq("id", excludeOrgId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = (data ?? []).filter((o) => {
    if (!q) return true;
    return (
      String(o.name).toLowerCase().includes(q) ||
      String(o.campus ?? "").toLowerCase().includes(q)
    );
  });

  return NextResponse.json(filtered);
}
