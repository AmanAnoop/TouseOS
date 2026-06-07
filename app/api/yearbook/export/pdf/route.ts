import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadActiveMembershipServer } from "@/lib/active-org-membership-server";
import { loadYearbookExportData } from "@/lib/yearbook-data";
import { buildYearbookPdf } from "@/lib/yearbook-pdf";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgIdParam = new URL(request.url).searchParams.get("org_id");
  const membership = await loadActiveMembershipServer(user.id);
  if (!membership) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const orgId = orgIdParam && orgIdParam === membership.orgId ? orgIdParam : membership.orgId;
  const orgName = membership.orgName || "Chapter";

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
