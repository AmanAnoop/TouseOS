import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

const DEFAULT_MODULES = [
  { title: "Anti-hazing acknowledgement", description: "Read and sign the anti-hazing policy", is_required: true, order_index: 0 },
  { title: "Chapter values & history", description: "Learn founding principles and chapter history", is_required: true, order_index: 1 },
  { title: "Risk management overview", description: "Chapter risk policies and procedures", is_required: true, order_index: 2 },
  { title: "Member responsibilities", description: "Dues, attendance, and officer roles", is_required: true, order_index: 3 },
  { title: "Financial policies", description: "How dues and chapter finances work", is_required: true, order_index: 4 },
  { title: "Social media guidelines", description: "Brand standards and content policies", is_required: false, order_index: 5 },
  { title: "Big/little program intro", description: "How matching works", is_required: false, order_index: 6 },
  {
    title: "Community values quiz",
    description: "Test knowledge of chapter values",
    is_required: true,
    order_index: 7,
    content: "Our chapter values integrity, scholarship, and service. Members are expected to uphold these in all chapter activities.",
    quiz_questions: [
      {
        question: "Which value emphasizes academic excellence?",
        options: ["Integrity", "Scholarship", "Service", "Social"],
        correctIndex: 1,
      },
      {
        question: "Members should report policy violations to:",
        options: ["No one", "Social media", "Chapter officers", "Alumni only"],
        correctIndex: 2,
      },
      {
        question: "Philanthropy events support:",
        options: ["Personal profit", "Community and charitable causes", "Only nationals", "Vendors"],
        correctIndex: 1,
      },
    ],
  },
];

const MODULE_ROWS = DEFAULT_MODULES.map((m) => ({
  ...m,
  content: "content" in m ? (m as { content?: string }).content ?? null : null,
  quiz_questions: "quiz_questions" in m ? (m as { quiz_questions?: unknown[] }).quiz_questions ?? [] : [],
}));

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = await request.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  const role = String(membership?.role ?? "general_member") as RoleName;
  if (!can(role, "manage_nme") && !can(role, "manage_org_settings")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await supabase
    .from("nme_modules")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ message: "Modules already exist", seeded: 0 });
  }

  const rows = MODULE_ROWS.map((m) => ({ org_id: orgId, ...m }));
  const { error } = await supabase.from("nme_modules").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, seeded: rows.length });
}
