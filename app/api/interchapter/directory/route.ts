import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { GREEK_LETTER_ORGS, type GreekOrgKind } from "@/lib/greek-letter-orgs";

/** National Greek org directory with platform chapter listings. */
export async function GET(request: Request) {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServiceClient();

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim().toLowerCase() ?? "";
  const kind = params.get("kind") as GreekOrgKind | "all" | null;
  const excludeOrgId = params.get("exclude_org_id");

  let orgQuery = supabase
    .from("organizations")
    .select("id, name, type, campus, settings")
    .in("type", ["fraternity", "sorority"])
    .order("name")
    .limit(500);

  if (excludeOrgId) orgQuery = orgQuery.neq("id", excludeOrgId);
  if (kind === "fraternity" || kind === "sorority") {
    orgQuery = orgQuery.eq("type", kind);
  }

  const { data: platformOrgs, error } = await orgQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const chaptersByAffiliation = new Map<string, Array<{ id: string; name: string; campus: string | null; type: string }>>();

  for (const org of platformOrgs ?? []) {
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const affiliationId =
      typeof settings.greek_affiliation_id === "string"
        ? settings.greek_affiliation_id
        : null;
    const key = affiliationId ?? `_unlinked_${String(org.type)}`;
    const list = chaptersByAffiliation.get(key) ?? [];
    list.push({
      id: String(org.id),
      name: String(org.name),
      campus: org.campus ? String(org.campus) : null,
      type: String(org.type),
    });
    chaptersByAffiliation.set(key, list);
  }

  let national = GREEK_LETTER_ORGS;
  if (kind === "fraternity" || kind === "sorority") {
    national = national.filter((o) => o.kind === kind);
  }
  if (q) {
    national = national.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.letters.toLowerCase().includes(q) ||
        o.id.includes(q),
    );
  }

  const directory = national.map((org) => {
    const chapters = (chaptersByAffiliation.get(org.id) ?? []).filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.campus ?? "").toLowerCase().includes(q)
      );
    });
    return {
      id: org.id,
      name: org.name,
      letters: org.letters,
      kind: org.kind,
      primary: org.primary,
      secondary: org.secondary,
      chapters,
      chapterCount: chapters.length,
    };
  });

  const filtered = q
    ? directory.filter((d) => d.chapterCount > 0 || d.name.toLowerCase().includes(q))
    : directory;

  return NextResponse.json({
    directory: filtered,
    totalNational: filtered.length,
    totalChapters: filtered.reduce((s, d) => s + d.chapterCount, 0),
  });
}
