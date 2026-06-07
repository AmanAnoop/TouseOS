import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = new URL(request.url).searchParams.get("org_id");
  if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("transition_binders")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    orgId, role, semester, year, responsibilities, lessonsLearned,
    recommendations, keyDeadlines, keyContacts, vendorNotes, budgetNotes, unfinishedTasks,
    keyDeadlinesText, keyContactsText,
  } = body;
  if (!orgId || !role) {
    return NextResponse.json({ error: "orgId and role required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("transition_binders").insert({
    org_id: orgId,
    role,
    semester: semester ?? "fall",
    year: parseInt(String(year), 10) || new Date().getFullYear(),
    responsibilities: responsibilities || null,
    lessons_learned: lessonsLearned || null,
    recommendations: recommendations || null,
    key_deadlines: keyDeadlines?.length
      ? keyDeadlines
      : typeof keyDeadlinesText === "string"
        ? keyDeadlinesText.split("\n").filter(Boolean).map((d: string) => ({ deadline: d }))
        : [],
    key_contacts: keyContacts?.length
      ? keyContacts
      : typeof keyContactsText === "string"
        ? keyContactsText.split("\n").filter(Boolean).map((c: string) => ({ contact: c }))
        : [],
    vendor_notes: vendorNotes || null,
    budget_notes: budgetNotes || null,
    unfinished_tasks: unfinishedTasks || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
