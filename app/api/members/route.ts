import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { filterPendingInvites, filterRosterMembers, isPendingInvite } from "@/lib/member-filters";
import { enrichMemberPhotos } from "@/lib/member-photo";
import type { MemberProfile } from "@/types";

async function attachProfileAvatars(
  supabase: Awaited<ReturnType<typeof createClient>>,
  members: MemberProfile[],
) {
  const userIds = [
    ...new Set(
      members.map((m) => m.user_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  if (userIds.length === 0) return members;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .in("id", userIds);

  const avatarByUser = new Map(
    (profiles ?? []).map((p) => [String(p.id), p.avatar_url as string | null]),
  );

  return members.map((m) => ({
    ...m,
    profiles: m.user_id
      ? { avatar_url: avatarByUser.get(String(m.user_id)) ?? null }
      : null,
  }));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const scope = searchParams.get("scope") ?? "roster";
  const includePayments = searchParams.get("include_payments") === "1";

  const { data, error } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withAvatars = await attachProfileAvatars(supabase, (data ?? []) as MemberProfile[]);
  const enriched = enrichMemberPhotos(withAvatars);

  let members = enriched;
  if (scope === "roster") {
    members = filterRosterMembers(enriched);
  } else if (scope === "invited") {
    members = filterPendingInvites(enriched);
  } else if (searchParams.get("exclude") === "pending_invite") {
    members = filterRosterMembers(enriched);
  }

  if (includePayments && members.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select("member_id, amount, paid_amount, status, due_date")
      .eq("org_id", orgId);

    const byMember = new Map<string, {
      amountDue: number;
      amountPaid: number;
      balance: number;
      overdue: boolean;
    }>();

    for (const p of payments ?? []) {
      if (!p.member_id) continue;
      const mid = String(p.member_id);
      const prev = byMember.get(mid) ?? { amountDue: 0, amountPaid: 0, balance: 0, overdue: false };
      const amount = Number(p.amount ?? 0);
      const paid = Number(p.paid_amount ?? 0);
      prev.amountDue += amount;
      prev.amountPaid += paid;
      prev.balance += Math.max(0, amount - paid);
      if (p.status === "overdue" || (p.status === "pending" && p.due_date && new Date(String(p.due_date)) < new Date())) {
        prev.overdue = true;
      }
      byMember.set(mid, prev);
    }

    members = members.map((m) => ({
      ...m,
      dues_summary: byMember.get(m.id) ?? null,
    }));
  }

  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { orgId, fullName, email, phone, role, classYear, major, hometown } = body;

  const { data, error } = await supabase.from("member_profiles").insert({
    org_id: orgId,
    full_name: fullName,
    email,
    phone,
    role: role ?? "general_member",
    class_year: classYear,
    major,
    hometown,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "member_created",
    resource_type: "member_profiles",
    resource_id: data.id,
    metadata: { full_name: fullName, email },
  });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const orgId = searchParams.get("org_id");
  if (!id || !orgId) return NextResponse.json({ error: "id and org_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("member_profiles")
    .select("membership_status")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!isPendingInvite(member)) {
    return NextResponse.json({ error: "Only pending invites can be removed this way" }, { status: 400 });
  }

  const { error } = await supabase
    .from("member_profiles")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
