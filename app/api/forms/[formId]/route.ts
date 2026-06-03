import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { formId } = await params;
  const { data: form, error } = await supabase.from("forms").select("*").eq("id", formId).single();
  if (error || !form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  let alreadySubmitted = false;
  const { data: mp } = await supabase
    .from("member_profiles")
    .select("id")
    .eq("org_id", form.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mp) {
    const { data: existing } = await supabase
      .from("form_responses")
      .select("id")
      .eq("form_id", formId)
      .eq("member_id", mp.id)
      .maybeSingle();
    alreadySubmitted = !!existing;
  }

  return NextResponse.json({ form, alreadySubmitted, memberId: mp?.id ?? null });
}
