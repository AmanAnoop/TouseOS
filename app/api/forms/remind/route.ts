import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { can, type RoleName } from "@/lib/permissions";
import { getMemberRole } from "@/lib/api-org-role";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, formId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const role = await getMemberRole(supabase, user.id, orgId) as RoleName;
  if (!can(role, "manage_org_settings") && !can(role, "manage_documents")) {
    return NextResponse.json({ error: "Officer access required" }, { status: 403 });
  }

  let formsQuery = supabase
    .from("forms")
    .select("id, title, is_required")
    .eq("org_id", orgId)
    .eq("is_required", true);

  if (formId) formsQuery = formsQuery.eq("id", formId);

  const { data: requiredForms } = await formsQuery;
  if (!requiredForms?.length) {
    return NextResponse.json({ reminded: 0, message: "No required forms to remind about." });
  }

  const formIds = requiredForms.map((f) => f.id);

  const [{ data: members }, { data: responses }] = await Promise.all([
    supabase
      .from("member_profiles")
      .select("id, user_id, full_name")
      .eq("org_id", orgId)
      .in("membership_status", ["active", "new_member"])
      .not("user_id", "is", null),
    supabase
      .from("form_responses")
      .select("form_id, member_id")
      .in("form_id", formIds),
  ]);

  const submitted = new Set(
    (responses ?? []).map((r) => `${r.form_id}:${r.member_id}`),
  );

  const service = await createServiceClient();
  let reminded = 0;

  for (const member of members ?? []) {
    const missing = requiredForms.filter(
      (f) => !submitted.has(`${f.id}:${member.id}`),
    );
    if (!missing.length || !member.user_id) continue;

    const titles = missing.map((f) => f.title).slice(0, 3).join(", ");
    const more = missing.length > 3 ? ` +${missing.length - 3} more` : "";

    const { error } = await createNotification(service, {
      userId: String(member.user_id),
      orgId,
      type: "form_missing",
      title: "Form completion reminder",
      body: `Please complete: ${titles}${more}`,
      link: missing.length === 1 ? `/forms/${missing[0].id}/fill` : "/forms",
    });
    if (!error) reminded += 1;
  }

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "form_reminders_sent",
    resource_type: "forms",
    metadata: { reminded, form_ids: formIds },
  });

  return NextResponse.json({
    reminded,
    message: reminded > 0
      ? `Sent ${reminded} reminder${reminded > 1 ? "s" : ""} for missing required forms.`
      : "All members have completed required forms.",
  });
}
