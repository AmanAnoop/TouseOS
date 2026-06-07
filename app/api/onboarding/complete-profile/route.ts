import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId, phone, classYear, major, hometown, emergencyContactName, emergencyContactPhone } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const service = await createServiceClient();
  const { data: member, error } = await service
    .from("member_profiles")
    .update({
      phone: phone || null,
      class_year: classYear || null,
      major: major || null,
      hometown: hometown || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !member) {
    return NextResponse.json({ error: error?.message ?? "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
