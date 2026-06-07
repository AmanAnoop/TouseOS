import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { forbidUnless, getMemberRole } from "@/lib/api-org-role";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, name, roleLabel, category, phone, email, notes } = body;
  if (!orgId || !name?.trim()) {
    return NextResponse.json({ error: "orgId and name required" }, { status: 400 });
  }

  const role = await getMemberRole(supabase, user.id, String(orgId));
  const denied = forbidUnless(role, "manage_housing");
  if (denied) return denied;

  const { data, error } = await supabase.from("housing_contacts").insert({
    org_id: orgId,
    name: name.trim(),
    role_label: roleLabel || null,
    category: category ?? "general",
    phone: phone || null,
    email: email || null,
    notes: notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, orgId, name, roleLabel, category, phone, email, notes } = await request.json();
  if (!id || !orgId) return NextResponse.json({ error: "id and orgId required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, String(orgId));
  const denied = forbidUnless(role, "manage_housing");
  if (denied) return denied;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (roleLabel !== undefined) updates.role_label = roleLabel || null;
  if (category !== undefined) updates.category = category;
  if (phone !== undefined) updates.phone = phone || null;
  if (email !== undefined) updates.email = email || null;
  if (notes !== undefined) updates.notes = notes || null;

  const { data, error } = await supabase.from("housing_contacts").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!id || !orgId) return NextResponse.json({ error: "id and org_id required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId);
  const denied = forbidUnless(role, "manage_housing");
  if (denied) return denied;

  const { error } = await supabase.from("housing_contacts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
