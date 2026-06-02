import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildYearbookHtml } from "@/lib/yearbook-export";
import { loadYearbookExportData } from "@/lib/yearbook-data";

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
  const orgName = String(((m.organizations as unknown) as Record<string, unknown>)?.name ?? "Chapter");

  const exportData = await loadYearbookExportData(supabase, orgId, orgName);
  const html = buildYearbookHtml(exportData);

  const filename = `${orgName.toLowerCase().replace(/\s+/g, "-")}-yearbook.html`;
  const autoprint = new URL(request.url).searchParams.get("autoprint") === "1";
  const htmlOut = autoprint && !html.includes("autoprint=1")
    ? html.replace("</body>", `<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},600)});</script></body>`)
    : html;

  return new NextResponse(htmlOut, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
