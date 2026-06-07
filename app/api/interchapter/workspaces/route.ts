import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interchapterThreadId } from "@/lib/interchapter-thread";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const proposalId = searchParams.get("proposalId");

  if (id) {
    const { data, error } = await supabase.from("interchapter_workspaces").select("*").eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ workspace: data });
  }

  if (proposalId) {
    const { data } = await supabase.from("interchapter_workspaces").select("*").eq("proposal_id", proposalId).maybeSingle();
    return NextResponse.json({ workspace: data });
  }

  return NextResponse.json({ error: "id or proposalId required" }, { status: 400 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { proposalId, title, orgIds } = await request.json();
  if (!proposalId || !orgIds?.length) {
    return NextResponse.json({ error: "proposalId and orgIds required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("interchapter_workspaces")
    .select("id")
    .eq("proposal_id", proposalId)
    .maybeSingle();

  if (existing) return NextResponse.json({ workspace: existing });

  const { data, error } = await supabase.from("interchapter_workspaces").insert({
    proposal_id: proposalId,
    org_ids: orgIds,
    title: title ?? "Joint event workspace",
    status: "active",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspace: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, chatMessage, task, taskToggle, budgetLine, guest, riskItem, sharedDocument, senderName } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: ws } = await supabase.from("interchapter_workspaces").select("*").eq("id", id).single();
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (chatMessage) {
    const messages = (ws.chat_messages as unknown[]) ?? [];
    const entry = {
      id: crypto.randomUUID(),
      sender: senderName ?? "Officer",
      body: chatMessage,
      created_at: new Date().toISOString(),
    };
    updates.chat_messages = [...messages, entry];

    const orgIds = (ws.org_ids as string[]) ?? [];
    if (orgIds.length >= 2) {
      const [orgA, orgB] = orgIds;
      const tid = interchapterThreadId(orgA, orgB);
      const bodyText = `[Workspace: ${ws.title}] ${chatMessage}`;
      await Promise.all(
        orgIds.map((oid) =>
          supabase.from("messages").insert({
            org_id: oid,
            sender_id: user.id,
            sender_name: senderName ?? "Officer",
            thread_id: tid,
            body: bodyText,
            recipient_org_id: orgIds.find((id) => id !== oid) ?? null,
            audience: "interchapter",
          }),
        ),
      );
    }
  }
  if (task) {
    const tasks = (ws.shared_tasks as unknown[]) ?? [];
    updates.shared_tasks = [...tasks, { id: crypto.randomUUID(), ...task, done: false }];
  }
  if (taskToggle?.id !== undefined) {
    const tasks = ((ws.shared_tasks as Array<{ id: string; done?: boolean }>) ?? []).map((t) =>
      t.id === taskToggle.id ? { ...t, done: Boolean(taskToggle.done) } : t,
    );
    updates.shared_tasks = tasks;
  }
  if (budgetLine) {
    const budget = (ws.shared_budget as { line_items?: unknown[] }) ?? {};
    updates.shared_budget = {
      ...budget,
      line_items: [...(budget.line_items ?? []), budgetLine],
    };
  }
  if (guest) {
    const guests = (ws.guest_list as unknown[]) ?? [];
    updates.guest_list = [...guests, guest];
  }
  if (riskItem) {
    updates.risk_checklist = { ...(ws.risk_checklist as object ?? {}), ...riskItem };
  }
  if (sharedDocument) {
    const docs = (ws.shared_documents as unknown[]) ?? [];
    updates.shared_documents = [
      ...docs,
      {
        id: crypto.randomUUID(),
        title: String(sharedDocument.title ?? "Document"),
        url: String(sharedDocument.url ?? ""),
        uploaded_by: senderName ?? "Officer",
        created_at: new Date().toISOString(),
      },
    ];
  }

  const { data, error } = await supabase.from("interchapter_workspaces").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workspace: data });
}
