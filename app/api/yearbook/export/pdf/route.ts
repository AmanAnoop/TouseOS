import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadYearbookExportData } from "@/lib/yearbook-data";
import { buildYearbookPdf } from "@/lib/yearbook-pdf";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgIdParam = new URL(request.url).searchParams.get("org_id");

  const { data: m } = await supabase
    .from("org_members")
    .select("org_id, organizations(name)")
    .eq("user_id", user.id)
    .neq("status", "removed")
    .limit(1)
    .single();

  if (!m) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const orgId = orgIdParam && orgIdParam === m.org_id ? orgIdParam : m.org_id;
  const orgName = String(
    ((m.organizations as unknown) as Record<string, unknown>)?.name ?? "Chapter",
  );

  const data = await loadYearbookExportData(supabase, orgId, orgName);
  const pdfBytes = await buildYearbookPdf(data);
  const filename = `${orgName.toLowerCase().replace(/\s+/g, "-")}-yearbook.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
