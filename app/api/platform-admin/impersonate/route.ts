import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import {
  IMPERSONATE_CREATED_COOKIE,
  IMPERSONATE_ORG_COOKIE,
  isPlatformImpersonationEnabled,
} from "@/lib/platform-impersonate";

async function assertPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!isPlatformImpersonationEnabled()) {
    return {
      error: NextResponse.json(
        { error: "Set PLATFORM_IMPERSONATION_ENABLED=true to use view-as-chapter" },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export async function POST(request: Request) {
  const auth = await assertPlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { user } = auth;

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const service = await createServiceClient();
  const { data: org } = await service.from("organizations").select("id, name").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { data: existing } = await service
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user!.id)
    .maybeSingle();

  let createdMembership = false;
  if (!existing) {
    const { error } = await service.from("org_members").insert({
      org_id: orgId,
      user_id: user!.id,
      role: "advisor",
      status: "active",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    createdMembership = true;
  }

  await service.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user!.id,
    action: "platform_impersonate_start",
    resource_type: "organizations",
    resource_id: orgId,
    metadata: { created_membership: createdMembership },
  });

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  cookieStore.set(IMPERSONATE_CREATED_COOKIE, createdMembership ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return NextResponse.json({ ok: true, orgId, orgName: org.name, createdMembership });
}

export async function DELETE() {
  const auth = await assertPlatformAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { user } = auth;

  const cookieStore = await cookies();
  const orgId = cookieStore.get(IMPERSONATE_ORG_COOKIE)?.value;
  const created = cookieStore.get(IMPERSONATE_CREATED_COOKIE)?.value === "1";

  if (orgId && created) {
    const service = await createServiceClient();
    await service
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .eq("role", "advisor");
  }

  if (orgId) {
    const service = await createServiceClient();
    await service.from("audit_logs").insert({
      org_id: orgId,
      actor_id: user!.id,
      action: "platform_impersonate_stop",
      resource_type: "organizations",
      resource_id: orgId,
      metadata: { removed_membership: created },
    });
  }

  cookieStore.delete(IMPERSONATE_ORG_COOKIE);
  cookieStore.delete(IMPERSONATE_CREATED_COOKIE);

  return NextResponse.json({ ok: true });
}
