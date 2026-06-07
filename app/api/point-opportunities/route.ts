import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManagePoints, getOrgRole } from "@/lib/point-access";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  const activeOnly = new URL(request.url).searchParams.get("active") !== "false";
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  let query = supabase
    .from("point_opportunities")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, name, description, points, category } = await request.json();
  if (!orgId || !name?.trim()) {
    return NextResponse.json({ error: "orgId and name required" }, { status: 400 });
  }

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManagePoints(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pts = Math.max(1, Math.min(100, parseInt(String(points ?? 1), 10) || 1));

  const { data, error } = await supabase
    .from("point_opportunities")
    .insert({
      org_id: orgId,
      name: name.trim(),
      description: description?.trim() || null,
      points: pts,
      category: category?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, id, name, description, points, category, active } = await request.json();
  if (!orgId || !id) return NextResponse.json({ error: "orgId and id required" }, { status: 400 });

  const role = await getOrgRole(supabase, orgId, user.id);
  if (!canManagePoints(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = String(name).trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (points !== undefined) updates.points = Math.max(1, Math.min(100, parseInt(String(points), 10) || 1));
  if (category !== undefined) updates.category = category?.trim() || null;
  if (active !== undefined) updates.active = Boolean(active);

  const { data, error } = await supabase
    .from("point_opportunities")
    .update(updates)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
