import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { extractInterestsFromBio } from "@/lib/interest-extractor";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    pnmId,
    orgId,
    bioText,
    instagramHandle,
    consentConfirmed,
  } = await request.json();

  if (!pnmId || !orgId || !bioText?.trim()) {
    return NextResponse.json({ error: "pnmId, orgId, and bioText required" }, { status: 400 });
  }

  if (!consentConfirmed) {
    return NextResponse.json({
      error: "Consent required. Confirm the PNM agreed to use their public profile info for rush matching.",
    }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .neq("status", "removed")
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_recruitment")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: pnm, error: pnmErr } = await supabase
    .from("pnm_leads")
    .select("id, org_id, full_name, major, hometown, interests, tags, instagram_handle")
    .eq("id", pnmId)
    .eq("org_id", orgId)
    .single();

  if (pnmErr || !pnm) return NextResponse.json({ error: "PNM not found" }, { status: 404 });

  const extracted = await extractInterestsFromBio(bioText, {
    fullName: pnm.full_name,
    major: pnm.major,
    hometown: pnm.hometown,
  });

  const mergedInterests = [
    ...new Set([
      ...(pnm.interests ?? []),
      ...extracted.interests,
      ...extracted.traits,
    ].map((s) => s.toLowerCase().trim()).filter(Boolean)),
  ].slice(0, 25);

  const handle = instagramHandle?.replace(/^@/, "") ?? pnm.instagram_handle;

  const { data: updated, error: updateErr } = await supabase
    .from("pnm_leads")
    .update({
      instagram_handle: handle || pnm.instagram_handle,
      instagram_bio_text: bioText.trim().slice(0, 8000),
      ai_interest_summary: extracted.summary || null,
      interests: mergedInterests,
      profile_enriched_at: new Date().toISOString(),
      enrichment_consent: true,
      enrichment_consent_at: new Date().toISOString(),
    })
    .eq("id", pnmId)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await supabase.from("pnm_enrichment_logs").insert({
    org_id: orgId,
    pnm_id: pnmId,
    actor_id: user.id,
    source: "manual_bio_paste",
    consent_confirmed: true,
  });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "pnm_profile_enriched",
    resource_type: "pnm_leads",
    resource_id: pnmId,
    metadata: {
      interestCount: mergedInterests.length,
      usedAi: isAnthropicConfigured(),
    },
  });

  return NextResponse.json({
    success: true,
    pnm: updated,
    extracted,
    notice:
      "TouseOS does not scrape Instagram automatically. Interests were extracted from the bio text you provided with documented consent.",
  });
}
