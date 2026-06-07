import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type RoleName } from "@/lib/permissions";

const METHOD_LABEL: Record<string, string> = {
  rotating_ticket: "Ticket scan",
  qr: "Chapter QR",
  manual: "Manual",
};

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: event } = await supabase
    .from("events")
    .select("id, org_id, title")
    .eq("id", eventId)
    .single();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", event.org_id)
    .eq("user_id", user.id)
    .neq("status", "removed")
    .maybeSingle();

  const role = String(membership?.role ?? "") as RoleName;
  if (!can(role, "manage_events")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: members } = await supabase
    .from("member_profiles")
    .select("id, full_name, membership_status")
    .eq("org_id", event.org_id)
    .in("membership_status", ["active", "new_member", "admin"]);

  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("member_id, guest_name, checked_in, checked_in_at, check_in_method")
    .eq("event_id", eventId);

  const rsvpByMember = new Map(
    (rsvps ?? [])
      .filter((r) => r.member_id)
      .map((r) => [String(r.member_id), r]),
  );

  const rows: Array<{ name: string; checkedInAt: string | null; method: string }> = [];

  for (const m of members ?? []) {
    const r = rsvpByMember.get(String(m.id));
    rows.push({
      name: String(m.full_name),
      checkedInAt: r?.checked_in ? String(r.checked_in_at ?? "") : null,
      method: r?.checked_in ? (METHOD_LABEL[String(r.check_in_method ?? "manual")] ?? "Manual") : "",
    });
  }

  for (const r of rsvps ?? []) {
    if (r.member_id || !r.guest_name) continue;
    rows.push({
      name: String(r.guest_name),
      checkedInAt: r.checked_in ? String(r.checked_in_at ?? "") : null,
      method: r.checked_in ? (METHOD_LABEL[String(r.check_in_method ?? "manual")] ?? "Manual") : "",
    });
  }

  rows.sort((a, b) => lastName(a.name).localeCompare(lastName(b.name), undefined, { sensitivity: "base" }));

  const header = "Last name,Full name,Checked in,Method";
  const lines = rows.map((r) => {
    const parts = r.name.split(/\s+/);
    const ln = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const checked = r.checkedInAt
      ? new Date(r.checkedInAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : "";
    const escaped = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [escaped(ln ?? ""), escaped(r.name), escaped(checked), escaped(r.method)].join(",");
  });

  const csv = [header, ...lines].join("\n");
  const filename = `${event.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}-attendance.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
