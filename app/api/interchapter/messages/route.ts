import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function threadId(orgA: string, orgB: string) {
  const [a, b] = [orgA, orgB].sort();
  return `interchapter:${a}:${b}`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const partnerOrgId = searchParams.get("partner_org_id");
  if (!orgId || !partnerOrgId) {
    return NextResponse.json({ error: "org_id and partner_org_id required" }, { status: 400 });
  }

  const tid = threadId(orgId, partnerOrgId);

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", tid)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, partnerOrgId, body, senderName } = await request.json();
  if (!orgId || !partnerOrgId || !body?.trim()) {
    return NextResponse.json({ error: "orgId, partnerOrgId, and body required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tid = threadId(orgId, partnerOrgId);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      org_id: orgId,
      sender_id: user.id,
      sender_name: senderName ?? user.email ?? "Officer",
      thread_id: tid,
      body: body.trim(),
      recipient_org_id: partnerOrgId,
      audience: "interchapter",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
