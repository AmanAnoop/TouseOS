import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const VALID_ORG_TYPES = [
  "fraternity",
  "sorority",
  "club_sports",
  "general_org",
  "university",
] as const;

type OrgType = (typeof VALID_ORG_TYPES)[number];

async function createViaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    name: string;
    type: OrgType;
    campus?: string;
    councilOrLeague?: string;
    contactEmail?: string;
  },
) {
  const { data, error } = await supabase.rpc("create_onboarding_org", {
    p_name: params.name,
    p_type: params.type,
    p_campus: params.campus ?? null,
    p_council_or_league: params.councilOrLeague ?? null,
    p_contact_email: params.contactEmail ?? null,
  });

  if (error) return { error: error.message };
  const row = data as Record<string, unknown>;
  return {
    org: {
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      inviteCode: String(row.invite_code ?? ""),
    },
  };
}

async function createViaServiceRole(
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  params: {
    name: string;
    type: OrgType;
    campus?: string;
    councilOrLeague?: string;
    contactEmail?: string;
  },
) {
  const admin = await createServiceClient();
  const fullName =
    String(user.user_metadata?.full_name ?? "") ||
    user.email?.split("@")[0] ||
    "Chapter Admin";

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: params.name.trim(),
      type: params.type,
      campus: params.campus?.trim() || null,
      council_or_league: params.councilOrLeague?.trim() || null,
      contact_email: params.contactEmail?.trim() || user.email,
    })
    .select("id, name, invite_code, type")
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? "Failed to create organization" };
  }

  await admin.from("profiles").upsert({ id: user.id, full_name: fullName });

  const { error: memberError } = await admin.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: memberError.message };
  }

  const { error: profileError } = await admin.from("member_profiles").insert({
    org_id: org.id,
    user_id: user.id,
    full_name: fullName,
    email: user.email ?? "",
    role: "owner",
    membership_status: "active",
  });

  if (profileError) {
    await admin.from("org_members").delete().eq("org_id", org.id).eq("user_id", user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    return { error: profileError.message };
  }

  return {
    org: {
      id: org.id,
      name: org.name,
      type: org.type,
      inviteCode: org.invite_code ?? "",
    },
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, type, campus, councilOrLeague, contactEmail } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }
    if (!type || !VALID_ORG_TYPES.includes(type)) {
      return NextResponse.json({ error: "Valid organization type is required" }, { status: 400 });
    }

    const params = {
      name: name.trim(),
      type: type as OrgType,
      campus: typeof campus === "string" ? campus : undefined,
      councilOrLeague: typeof councilOrLeague === "string" ? councilOrLeague : undefined,
      contactEmail: typeof contactEmail === "string" ? contactEmail : undefined,
    };

    // Prefer RPC (works with anon key + user session; run migration 015)
    let result = await createViaRpc(supabase, params);

    const rpcMissing = (
      result.error
      && (result.error.includes("does not exist")
        || result.error.includes("Could not find the function"))
    );

    if (rpcMissing) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey || serviceKey.includes("your-service")) {
        return NextResponse.json(
          {
            error:
              "Onboarding is not configured. Run Supabase migration 015_onboarding_rpc.sql in the SQL editor, or set SUPABASE_SERVICE_ROLE_KEY in .env.local.",
          },
          { status: 503 },
        );
      }
      try {
        result = await createViaServiceRole(user, params);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Server configuration error";
        return NextResponse.json({ error: msg }, { status: 503 });
      }
    } else if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (!result.org) {
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }

    return NextResponse.json({ success: true, org: result.org });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
