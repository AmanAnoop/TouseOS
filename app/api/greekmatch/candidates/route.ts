import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rankGreekMatchCandidates } from "@/lib/greekmatch-scorer";

function genderMatchesPreference(
  candidateGender: string | null,
  interestedIn: string[] | null | undefined,
): boolean {
  if (!interestedIn?.length) return true;
  if (!candidateGender) return true;
  const g = candidateGender.toLowerCase();
  if (interestedIn.includes("everyone") || interestedIn.includes("all")) return true;
  if (g === "man" || g === "male") return interestedIn.includes("men") || interestedIn.includes("man");
  if (g === "woman" || g === "female") return interestedIn.includes("women") || interestedIn.includes("woman");
  return interestedIn.includes(g);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: mine, error: mineError } = await supabase
    .from("greekmatch_profiles")
    .select("*, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (mineError) return NextResponse.json({ error: mineError.message }, { status: 500 });
  if (!mine) return NextResponse.json({ myProfile: null, candidates: [], seenCount: 0 });

  if (mine.paused || !mine.is_active) {
    return NextResponse.json({ myProfile: mine, suspended: true, candidates: [], seenCount: 0 });
  }

  const [{ data: seen }, { data: blocks }] = await Promise.all([
    supabase.from("greekmatch_interactions").select("target_id").eq("actor_id", user.id),
    supabase.from("greekmatch_blocks").select("blocked_id").eq("blocker_id", user.id),
  ]);

  const excluded = new Set<string>([user.id]);
  for (const row of seen ?? []) excluded.add(String((row as { target_id: string }).target_id));
  for (const row of blocks ?? []) excluded.add(String((row as { blocked_id: string }).blocked_id));

  const { data: profiles, error } = await supabase
    .from("greekmatch_profiles")
    .select("*, organizations(name)")
    .eq("is_active", true)
    .eq("paused", false)
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const viewerAge = mine.age ?? null;
  const minAge = mine.min_age ?? 18;
  const maxAge = mine.max_age ?? 30;

  const filtered = ((profiles ?? []) as Array<Record<string, unknown>>)
    .filter((p) => {
      const uid = String(p.user_id);
      if (excluded.has(uid)) return false;
      if (!mine.same_org_ok && String(p.org_id) === String(mine.org_id)) return false;
      const age = p.age as number | null;
      if (age != null && (age < minAge || age > maxAge)) return false;
      if (viewerAge != null && age != null) {
        const theirMin = (p.min_age as number) ?? 18;
        const theirMax = (p.max_age as number) ?? 30;
        if (viewerAge < theirMin || viewerAge > theirMax) return false;
      }
      if (!genderMatchesPreference(p.gender as string | null, mine.interested_in as string[])) return false;
      if (!genderMatchesPreference(mine.gender as string | null, p.interested_in as string[])) return false;
      return true;
    })
    .map((p) => ({
      ...p,
      org_name: (p.organizations as Record<string, unknown>)?.name as string | undefined,
    }));

  const ranked = rankGreekMatchCandidates(
    {
      user_id: mine.user_id,
      interests: (mine.interests as string[]) ?? [],
      major: mine.major as string | null,
      graduation_year: mine.graduation_year as number | null,
      gender: mine.gender as string | null,
    },
    filtered as unknown as Array<{
      user_id: string;
      interests: string[];
      major: string | null;
      graduation_year: number | null;
      gender: string | null;
    } & Record<string, unknown>>,
  );

  return NextResponse.json({
    myProfile: mine,
    candidates: ranked,
    seenCount: (seen ?? []).length,
  });
}
