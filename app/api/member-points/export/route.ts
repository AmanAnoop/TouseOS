import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManagePoints, getOrgRole } from "@/lib/point-access";

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const category = searchParams.get("category");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManagePoints(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: members }, { data: entries }] = await Promise.all([
    supabase
      .from("member_profiles")
      .select("id, full_name, membership_status")
      .eq("org_id", orgId)
      .in("membership_status", ["active", "new_member", "admin"]),
    supabase
      .from("member_point_entries")
      .select("member_id, points, entry_type, category")
      .eq("org_id", orgId),
  ]);

  const totals = new Map<string, number>();
  const byCategory = new Map<string, Map<string, number>>();

  for (const e of entries ?? []) {
    const mid = String(e.member_id);
    const pts = Number(e.points ?? 0) * (e.entry_type === "deduction" ? -1 : 1);
    totals.set(mid, (totals.get(mid) ?? 0) + pts);

    const cat = String(e.category ?? "General").trim() || "General";
    if (!byCategory.has(cat)) byCategory.set(cat, new Map());
    const catMap = byCategory.get(cat)!;
    catMap.set(mid, (catMap.get(mid) ?? 0) + pts);
  }

  const rows = (members ?? []).map((m) => {
    const total = totals.get(String(m.id)) ?? 0;
    const catPts = category
      ? (byCategory.get(category)?.get(String(m.id)) ?? 0)
      : total;
    return {
      name: String(m.full_name),
      total,
      categoryPoints: catPts,
    };
  });

  rows.sort((a, b) => lastName(a.name).localeCompare(lastName(b.name), undefined, { sensitivity: "base" }));

  const catLabel = category ?? "All categories";
  const header = `Last name,Full name,Total points,${catLabel} points`;
  const lines = rows.map((r) => {
    const parts = r.name.split(/\s+/);
    const ln = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [esc(ln ?? ""), esc(r.name), String(r.total), String(r.categoryPoints)].join(",");
  });

  const csv = [header, ...lines].join("\n");
  const filename = `points-standings${category ? `-${category.replace(/[^a-z0-9]+/gi, "-")}` : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
