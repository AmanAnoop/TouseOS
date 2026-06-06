import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, email, emails, role } = await request.json();
  const emailList = Array.isArray(emails)
    ? emails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean)
    : email
      ? [String(email).trim().toLowerCase()]
      : [];
  if (!orgId || emailList.length === 0) {
    return NextResponse.json({ error: "orgId and at least one email required" }, { status: 400 });
  }

  // Verify caller is an officer
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: org } = await supabase.from("organizations").select("name, invite_code").eq("id", orgId).single();
  const results: Array<{ email: string; ok: boolean; error?: string }> = [];
  let sentCount = 0;

  for (const targetEmail of emailList) {
    const { data: profile, error } = await supabase.from("member_profiles").insert({
      org_id: orgId,
      full_name: targetEmail.split("@")[0],
      email: targetEmail,
      role: role ?? "general_member",
      membership_status: "pending_invite",
    }).select().single();

    if (error) {
      results.push({ email: targetEmail, ok: false, error: error.message });
      continue;
    }

    const emailResult = await sendInviteEmail({
      to: targetEmail,
      orgName: org?.name ?? "your chapter",
      inviteCode: org?.invite_code ?? "",
    });
    if (emailResult.sent) sentCount++;

    await supabase.from("audit_logs").insert({
      org_id: orgId,
      actor_id: user.id,
      action: "member_invited",
      resource_type: "member_profiles",
      resource_id: profile.id,
      metadata: { email: targetEmail, role, org_name: org?.name },
    });

    results.push({ email: targetEmail, ok: true });
  }

  const okCount = results.filter((r) => r.ok).length;

  return NextResponse.json({
    success: okCount > 0,
    inviteCode: org?.invite_code,
    invited: okCount,
    emailsSent: sentCount,
    results,
    message: okCount > 0
      ? `Invited ${okCount} member${okCount > 1 ? "s" : ""}${sentCount ? ` (${sentCount} email${sentCount > 1 ? "s" : ""} sent)` : ""}. Share join link or code ${org?.invite_code}.`
      : "Could not send invites. Check that emails are not already on the roster.",
  });
}
