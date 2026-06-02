import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const formId = searchParams.get("form_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data: forms } = await supabase.from("forms").select("id").eq("org_id", orgId);
  const formIds = (forms ?? []).map((f) => f.id);
  if (formIds.length === 0) return NextResponse.json({ counts: {}, total: 0 });

  if (formId) {
    const { data, error } = await supabase
      .from("form_responses")
      .select("form_id, member_id, submitted_at")
      .eq("form_id", formId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ responses: data ?? [] });
  }

  const { data, error } = await supabase.from("form_responses").select("form_id").in("form_id", formIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const fid = String((row as { form_id: string }).form_id);
    counts[fid] = (counts[fid] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return NextResponse.json({ counts, total });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { formId, responses, signature } = body as {
    formId: string;
    responses: Record<string, string | boolean>;
    signature?: string;
  };

  if (!formId || !responses) {
    return NextResponse.json({ error: "formId and responses required" }, { status: 400 });
  }

  const { data: form } = await supabase.from("forms").select("id, org_id, is_required").eq("id", formId).single();
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const { data: member, error: memberErr } = await supabase
    .from("member_profiles")
    .select("id, forms_completed, forms_required")
    .eq("org_id", form.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberErr || !member) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("form_responses")
    .select("id")
    .eq("form_id", formId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already submitted this form" }, { status: 409 });
  }

  const { data: row, error } = await supabase
    .from("form_responses")
    .insert({
      form_id: formId,
      member_id: member.id,
      responses,
      signature: signature ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const completed = (member.forms_completed ?? 0) + 1;
  await supabase
    .from("member_profiles")
    .update({ forms_completed: completed })
    .eq("id", member.id);

  return NextResponse.json(row, { status: 201 });
}
