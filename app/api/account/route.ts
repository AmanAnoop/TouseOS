import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");

  const [profileRes, membershipsRes, mpRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("org_members")
      .select("id, role, status, joined_at, organizations(name, type, campus)")
      .eq("user_id", user.id)
      .neq("status", "removed"),
    orgId
      ? supabase.from("member_profiles").select("id, interests").eq("user_id", user.id).eq("org_id", orgId).maybeSingle()
      : supabase.from("member_profiles").select("id, interests").eq("user_id", user.id).limit(1).maybeSingle(),
  ]);

  const profile = profileRes.data;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    profile: {
      fullName: profile.full_name,
      preferredName: profile.preferred_name,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      notificationEmail: profile.notification_email,
      notificationSms: profile.notification_sms,
      notificationPush: profile.notification_push,
      notificationPreferences: parseNotificationPreferences(profile.notification_preferences),
    },
    memberships: (membershipsRes.data ?? []).map((m: Record<string, unknown>) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      org: m.organizations,
    })),
    memberProfile: mpRes.data
      ? { id: mpRes.data.id, interests: (mpRes.data.interests as string[]) ?? [] }
      : null,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    fullName,
    preferredName,
    phone,
    memberEmail,
    notificationEmail,
    notificationSms,
    notificationPush,
    notificationPreferences,
    leaveMembershipId,
  } = body;

  if (leaveMembershipId) {
    const { data: row } = await supabase
      .from("org_members")
      .select("id")
      .eq("id", leaveMembershipId)
      .eq("user_id", user.id)
      .single();
    if (!row) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

    const { error } = await supabase
      .from("org_members")
      .update({ status: "removed" })
      .eq("id", leaveMembershipId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ left: true });
  }

  if (memberEmail !== undefined) {
    const email = String(memberEmail).trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const { error: mpError } = await supabase
      .from("member_profiles")
      .update({ email })
      .eq("user_id", user.id);
    if (mpError) return NextResponse.json({ error: mpError.message }, { status: 500 });
    return NextResponse.json({ memberEmailSynced: true, email });
  }

  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (preferredName !== undefined) updates.preferred_name = preferredName || null;
  if (phone !== undefined) updates.phone = phone || null;
  if (notificationEmail !== undefined) updates.notification_email = notificationEmail;
  if (notificationSms !== undefined) updates.notification_sms = notificationSms;
  if (notificationPush !== undefined) updates.notification_push = notificationPush;
  if (notificationPreferences !== undefined) {
    updates.notification_preferences = notificationPreferences as NotificationPreferences;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    profile: {
      fullName: data.full_name,
      preferredName: data.preferred_name,
      phone: data.phone,
      avatarUrl: data.avatar_url,
      notificationEmail: data.notification_email,
      notificationSms: data.notification_sms,
      notificationPush: data.notification_push,
      notificationPreferences: parseNotificationPreferences(data.notification_preferences),
    },
  });
}
