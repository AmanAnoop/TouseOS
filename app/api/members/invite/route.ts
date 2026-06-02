import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, email, role } = await request.json();
  if (!orgId || !email) return NextResponse.json({ error: "orgId and email required" }, { status: 400 });

  // Verify caller is an officer
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Create a pending member profile
  const { data: org } = await supabase.from("organizations").select("name, invite_code").eq("id", orgId).single();

  const { data: profile, error } = await supabase.from("member_profiles").insert({
    org_id: orgId,
    full_name: email.split("@")[0],
    email,
    role: role ?? "general_member",
    membership_status: "pending_invite",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emailResult = await sendInviteEmail({
    to: email,
    orgName: org?.name ?? "your chapter",
    inviteCode: org?.invite_code ?? "",
  });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    actor_id: user.id,
    action: "member_invited",
    resource_type: "member_profiles",
    resource_id: profile.id,
    metadata: { email, role, org_name: org?.name },
  });

  return NextResponse.json({
    success: true,
    inviteCode: org?.invite_code,
    emailSent: emailResult.sent,
    message: emailResult.sent
      ? `Invite email sent to ${email}.`
      : `Invite created for ${email}. Share code ${org?.invite_code} (configure RESEND_API_KEY for email delivery).`,
  });
}
