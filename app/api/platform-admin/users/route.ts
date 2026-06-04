import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = Math.min(100, parseInt(new URL(request.url).searchParams.get("limit") ?? "50", 10));
  const service = await createServiceClient();

  const { data: profiles, error } = await service
    .from("profiles")
    .select("id, full_name, email, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: memberships } = userIds.length
    ? await service.from("org_members").select("user_id, org_id, role, organizations(name)").in("user_id", userIds)
    : { data: [] };

  const orgsByUser = new Map<string, Array<{ org_id: string; role: string; org_name: string }>>();
  for (const m of memberships ?? []) {
    const uid = String(m.user_id);
    const org = m.organizations as { name?: string } | null;
    if (!orgsByUser.has(uid)) orgsByUser.set(uid, []);
    orgsByUser.get(uid)!.push({
      org_id: String(m.org_id),
      role: String(m.role),
      org_name: String(org?.name ?? "Org"),
    });
  }

  return NextResponse.json({
    users: (profiles ?? []).map((p) => ({
      ...p,
      organizations: orgsByUser.get(p.id) ?? [],
    })),
  });
}
