import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  PageHeader,
} from "@/components/ui";
import { Brush, Download, ExternalLink, Image, Link, Palette } from "lucide-react";

export const metadata = { title: "Social Asset Library" };
export const dynamic = "force-dynamic";

export default async function SocialAssetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase.from("org_members").select("org_id, organizations(name, primary_color, secondary_color, logo_url)").eq("user_id", user.id).limit(1).single();
  if (!m) redirect("/onboarding");

  const org = m.organizations as unknown as Record<string, unknown>;

  const TEMPLATE_CATEGORIES = [
    {
      label: "Mixer recap",
      items: ["Carousel template", "Story slides template", "Caption template"],
    },
    {
      label: "Recruitment",
      items: ["Bid day template", "Rush week calendar", "PNM interest form graphic"],
    },
    {
      label: "Philanthropy",
      items: ["Fundraiser announcement", "Donor shoutout template", "Progress bar graphic"],
    },
    {
      label: "Member spotlights",
      items: ["Senior spotlight", "Brother/Sister of the week", "Officer announcement"],
    },
    {
      label: "Events",
      items: ["Event announcement", "Event reminder story", "Recap post"],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Asset Library"
        description="Brand assets, templates, past captions, and Canva links"
      />

      {/* Brand kit */}
      <Card>
        <CardHeader title="Brand kit" description="Your chapter's visual identity" icon={<Palette size={16} />} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Brand colors</p>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg border border-border" style={{ background: String(org.primary_color ?? "#059669") }} />
                <p className="text-xs text-muted-foreground mt-1">Primary</p>
                <p className="text-xs font-mono">{String(org.primary_color ?? "#059669")}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg border border-border" style={{ background: String(org.secondary_color ?? "#065f46") }} />
                <p className="text-xs text-muted-foreground mt-1">Secondary</p>
                <p className="text-xs font-mono">{String(org.secondary_color ?? "#065f46")}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Chapter logo</p>
            {org.logo_url ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={String(org.logo_url)} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border" />
                <a href={String(org.logo_url)} download className="flex items-center gap-1 text-xs text-racing hover:underline">
                  <Download size={12} />
                  Download
                </a>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <Image size={20} className="text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Templates */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Brush size={16} />
          Content templates
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Card key={cat.label} padding="sm">
              <p className="font-semibold text-sm text-foreground mb-2">{cat.label}</p>
              <div className="space-y-1.5">
                {cat.items.map((item) => (
                  <div key={item} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item}</span>
                    <button className="text-xs text-racing hover:underline">Use</button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* External tools */}
      <Card>
        <CardHeader title="Design tools" description="External tools for creating chapter content" icon={<Link size={16} />} />
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { name: "Canva for Greek Life", url: "https://canva.com", description: "Drag-and-drop templates for posts, stories, and flyers" },
            { name: "Adobe Express", url: "https://express.adobe.com", description: "Quick content creation with brand colors" },
            { name: "Unfold", url: "https://unfoldapp.com", description: "Story and Reels templates for Instagram" },
          ].map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 p-3 rounded-xl border border-border hover:border-racing-300 hover:bg-surface-1 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{tool.name}</p>
                <ExternalLink size={12} className="text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{tool.description}</p>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
