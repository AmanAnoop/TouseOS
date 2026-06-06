import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Greek orgs on platform for proposal target picker */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim().toLowerCase() ?? "";
  const excludeOrgId = params.get("exclude_org_id");
  const kind = params.get("kind");

  let query = supabase
    .from("organizations")
    .select("id, name, type, campus")
    .in("type", ["fraternity", "sorority"])
    .order("name")
    .limit(80);

  if (excludeOrgId) query = query.neq("id", excludeOrgId);
  if (kind === "fraternity" || kind === "sorority") query = query.eq("type", kind);

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
