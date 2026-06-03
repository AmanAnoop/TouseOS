import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProductId, productHomePath } from "@/lib/org-product";
import { colorsForOrgStorage } from "@/lib/chapter-theme";
import { getGreekOrgById } from "@/lib/greek-letter-orgs";
import { getUniversityById } from "@/lib/university-colors";
import { REGAL_PRIMARY, REGAL_SECONDARY } from "@/lib/regal-theme";
import { ensureUserProfile } from "@/lib/ensure-user-profile";

const VALID_ORG_TYPES = new Set([
  "fraternity",
  "sorority",
  "club_sports",
  "general_org",
]);

async function createOrgDirect(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  input: {
    name: string;
    type: string;
    campus: string | null;
    councilOrLeague: string | null;
    contactEmail: string | null;
    primaryColor: string;
    secondaryColor: string;
    settings: Record<string, unknown>;
  },
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
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor,
      settings: input.settings,
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
      email: user.email ?? "member@local",
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
  const universityId = body.universityId ? String(body.universityId) : "";
  const greekAffiliationId = body.greekAffiliationId ? String(body.greekAffiliationId) : "";
  const greekOrg = getGreekOrgById(greekAffiliationId);
  const university = getUniversityById(universityId);
  const product = getProductId(type);
  const stored = colorsForOrgStorage({
    product,
    greekOrg: greekOrg?.id === "custom" ? undefined : greekOrg,
    university: university?.id === "custom-campus" ? undefined : university,
    primaryColor: body.primaryColor ? String(body.primaryColor) : REGAL_PRIMARY,
    secondaryColor: body.secondaryColor ? String(body.secondaryColor) : REGAL_SECONDARY,
  });
  const primaryColor = stored.primary_color;
  const secondaryColor = stored.secondary_color;

  if (!name || !type) {
    return NextResponse.json({ error: "Organization name and type are required" }, { status: 400 });
  }

  if (!VALID_ORG_TYPES.has(type)) {
    return NextResponse.json({ error: `Invalid organization type: ${type}` }, { status: 400 });
  }

  const service = await createServiceClient();
  const input = {
    name,
    type,
    campus,
    councilOrLeague,
    contactEmail,
    primaryColor,
    secondaryColor,
    settings: {
      university_id: universityId || null,
      greek_affiliation_id: greekAffiliationId || null,
    },
  };

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

  await service.from("organizations").update({
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    settings: input.settings,
  }).eq("id", org.id);

  const redirectTo = productHomePath(getProductId(org.type ?? type));

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
