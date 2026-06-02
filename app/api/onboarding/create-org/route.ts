import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProductId, productHomePath } from "@/lib/org-product";

const VALID_ORG_TYPES = new Set([
  "fraternity",
  "sorority",
  "club_sports",
  "general_org",
]);

async function ensureUserProfile(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
) {
  const { data: existing } = await service.from("profiles").select("id, full_name, email").eq("id", user.id).maybeSingle();
  if (existing) return existing;

  const fullName = String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Member");
  const { data: created, error } = await service.from("profiles").insert({
    id: user.id,
    full_name: fullName,
  }).select("id, full_name, email").single();

  if (error) throw new Error(`Could not create profile: ${error.message}`);
  return created;
}

async function createOrgDirect(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  input: { name: string; type: string; campus: string | null; councilOrLeague: string | null; contactEmail: string | null },
) {
  const profile = await ensureUserProfile(service, user);

  const { data: org, error: insertErr } = await service
    .from("organizations")
    .insert({
      name: input.name,
      type: input.type,
      campus: input.campus,
      council_or_league: input.councilOrLeague,
      contact_email: input.contactEmail,
    })
    .select("id, name, type, invite_code")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  const { error: memberErr } = await service.from("org_members").upsert(
    {
      org_id: org.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    },
    { onConflict: "org_id,user_id" },
  );
  if (memberErr) throw new Error(memberErr.message);

  const { data: existingMp } = await service
    .from("member_profiles")
    .select("id")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMp) {
    const { error: mpErr } = await service.from("member_profiles").insert({
      org_id: org.id,
      user_id: user.id,
      full_name: profile.full_name || input.name,
      email: profile.email ?? user.email ?? "member@local",
      role: "owner",
      membership_status: "active",
    });
    if (mpErr) throw new Error(mpErr.message);
  }

  return org;
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is required to create organizations." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized — sign in first" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "").trim();
  const campus = body.campus ? String(body.campus) : null;
  const councilOrLeague = body.councilOrLeague ? String(body.councilOrLeague) : null;
  const contactEmail = body.contactEmail ? String(body.contactEmail) : null;

  if (!name || !type) {
    return NextResponse.json({ error: "Organization name and type are required" }, { status: 400 });
  }

  if (!VALID_ORG_TYPES.has(type)) {
    return NextResponse.json({ error: `Invalid organization type: ${type}` }, { status: 400 });
  }

  const service = await createServiceClient();
  const input = { name, type, campus, councilOrLeague, contactEmail };

  let org: { id: string; name: string; type?: string; invite_code?: string | null };

  const { data: rpcData, error: rpcError } = await service.rpc("create_onboarding_org", {
    p_user_id: user.id,
    p_name: name,
    p_type: type,
    p_campus: campus,
    p_council: councilOrLeague,
    p_contact_email: contactEmail,
  });

  if (!rpcError && rpcData) {
    const parsed = rpcData as { id?: string; name?: string; invite_code?: string; type?: string };
    if (parsed.id) {
      org = {
        id: parsed.id,
        name: parsed.name ?? name,
        type,
        invite_code: parsed.invite_code ?? null,
      };
    } else {
      org = await createOrgDirect(service, user, input);
    }
  } else {
    const rpcMissing =
      rpcError?.code === "PGRST202"
      || rpcError?.message?.includes("function")
      || rpcError?.message?.includes("create_onboarding_org");

    if (rpcMissing) {
      try {
        org = await createOrgDirect(service, user, input);
      } catch (directErr) {
        const message = directErr instanceof Error ? directErr.message : "Failed to create organization";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    } else {
      try {
        org = await createOrgDirect(service, user, input);
      } catch (directErr) {
        return NextResponse.json(
          {
            error: rpcError?.message ?? (directErr instanceof Error ? directErr.message : "Failed to create organization"),
            hint: "Apply Supabase migration 015_onboarding_rpc.sql if this persists.",
          },
          { status: 500 },
        );
      }
    }
  }

  const product = getProductId(org.type ?? type);
  const redirectTo = productHomePath(product);

  const response = NextResponse.json({
    org: { id: org.id, name: org.name, type: org.type ?? type, invite_code: org.invite_code },
    inviteCode: org.invite_code,
    redirectTo,
  });

  response.cookies.set("touse_active_org_id", org.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
