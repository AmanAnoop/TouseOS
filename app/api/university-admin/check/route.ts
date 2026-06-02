import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUniversityAdminEmail } from "@/lib/university-admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false });

  return NextResponse.json({ ok: isUniversityAdminEmail(user.email) });
}
