import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: member } = await supabase
    .from("member_profiles")
    .select("id, full_name")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "Member profile not found" }, { status: 404 });

  const [{ data: org }, { data: modules }, { data: progress }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).single(),
    supabase.from("nme_modules").select("id, title, is_required").eq("org_id", orgId),
    supabase.from("nme_progress").select("module_id, completed, score").eq("member_id", member.id).eq("completed", true),
  ]);

  const required = (modules ?? []).filter((m) => m.is_required);
  const completedIds = new Set((progress ?? []).map((p) => String(p.module_id)));
  const allDone = required.every((m) => completedIds.has(String(m.id)));

  if (!allDone) {
    return NextResponse.json({ error: "Complete all required modules first" }, { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>NME Certificate</title>
<style>
  body { font-family: Georgia, serif; text-align: center; padding: 48px; }
  h1 { color: #1a4d2e; margin-bottom: 8px; }
  .name { font-size: 28px; font-weight: bold; margin: 24px 0; }
  .org { font-size: 18px; color: #555; }
  .date { margin-top: 32px; color: #666; }
</style></head><body>
  <h1>Certificate of Completion</h1>
  <p class="org">${org?.name ?? "Organization"}</p>
  <p>New Member Education Program</p>
  <p class="name">${member.full_name}</p>
  <p>has successfully completed all required education modules.</p>
  <p class="date">Issued ${new Date().toLocaleDateString()}</p>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="nme-certificate-${member.id}.html"`,
    },
  });
}
