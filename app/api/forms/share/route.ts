import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Public form metadata by share token (no auth). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = await createClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("id, org_id, title, description, type, fields, is_required")
    .eq("share_token", token)
    .single();

  if (error || !form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
  return NextResponse.json({ form });
}
