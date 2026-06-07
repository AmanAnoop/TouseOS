import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { photoDisplayUrl } from "@/lib/photo-access";
import { rankGreekMatchCandidates } from "@/lib/greekmatch-scorer";

async function resolvePhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photos: unknown,
): Promise<string[]> {
  if (!Array.isArray(photos)) return [];
  const out: string[] = [];
  for (const p of photos) {
    const s = String(p);
    if (s.startsWith("http")) {
      out.push(s);
      continue;
    }
    const url = await photoDisplayUrl(supabase, { storage_path: s });
    if (url) out.push(url);
  }
  return out;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) return NextResponse.json({ error: "Not in an organization" }, { status: 403 });
  if (!["fraternity", "sorority"].includes(membership.orgType)) {
    return NextResponse.json({ error: "GreekMatch is only for Greek organizations" }, { status: 403 });
  }

  const { data: mine } = await supabase
    .from("greekmatch_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mine) {
    return NextResponse.json({ myProfile: null, candidates: [], seenCount: 0, profileSuspended: false });
  }

  const profileSuspended = Boolean(mine.paused || !mine.is_active);

  if (profileSuspended) {
    return NextResponse.json({
      myProfile: mine,
      candidates: [],
      seenCount: 0,
      profileSuspended: true,
    });
  }

  const { data: seen } = await supabase
    .from("greekmatch_interactions")
    .select("target_id")
    .eq("actor_id", user.id);

  const seenIds = new Set((seen ?? []).map((s) => String(s.target_id)));

  const { data: blocks } = await supabase
    .from("greekmatch_blocks")
    .select("blocked_id, blocker_id")
    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

  const blockedIds = new Set<string>();
  for (const b of blocks ?? []) {
    if (b.blocker_id === user.id) blockedIds.add(String(b.blocked_id));
    if (b.blocked_id === user.id) blockedIds.add(String(b.blocker_id));
  }

  const { data: profiles, error } = await supabase
    .from("greekmatch_profiles")
    .select("*, organizations(name)")
    .eq("is_active", true)
    .eq("paused", false)
    .neq("user_id", user.id)
    .limit(40);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = (profiles ?? [])
    .filter((p) => {
      const uid = String(p.user_id);
      if (seenIds.has(uid) || blockedIds.has(uid)) return false;
      if (!mine.same_org_ok && String(p.org_id) === String(mine.org_id)) return false;
      return true;
    })
    .map((p) => {
      const org = p.organizations as { name?: string } | null;
      return {
        ...p,
        organizations: undefined,
        org_name: org?.name,
      };
    });

  const ranked = rankGreekMatchCandidates(
    mine as Parameters<typeof rankGreekMatchCandidates>[0],
    filtered as Parameters<typeof rankGreekMatchCandidates>[1],
  );

  const candidatesWithPhotos = await Promise.all(
    ranked.map(async (c) => ({
      ...c,
      photos: await resolvePhotos(supabase, (c as { photos?: unknown }).photos),
    })),
  );

  return NextResponse.json({
    myProfile: {
      ...mine,
      photos: await resolvePhotos(supabase, mine.photos),
    },
    candidates: candidatesWithPhotos,
    seenCount: seenIds.size,
    profileSuspended: false,
  });
}
