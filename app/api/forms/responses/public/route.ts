import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Anonymous form submission via share token. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { token, submitterName, submitterEmail, responses, signature } = await request.json();

  if (!token || !responses || !submitterName?.trim()) {
    return NextResponse.json({ error: "token, submitterName, and responses required" }, { status: 400 });
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, org_id, title")
    .eq("share_token", token)
    .single();

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const enriched = {
    ...responses,
    _submitter_name: submitterName.trim(),
    _submitter_email: submitterEmail?.trim() || null,
  };

  const { data: row, error } = await supabase
    .from("form_responses")
    .insert({
      form_id: form.id,
      member_id: null,
      responses: enriched,
      signature: signature ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_logs").insert({
    org_id: form.org_id,
    actor_id: null,
    action: "public_form_submitted",
    resource_type: "form_responses",
    resource_id: row.id,
    metadata: { form_id: form.id, submitter: submitterName.trim() },
  });

  return NextResponse.json(row, { status: 201 });
}
