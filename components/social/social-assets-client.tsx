"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brush, Copy, ExternalLink, Image as ImageIcon, Link, Palette, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Select,
  Tabs,
  Textarea,
} from "@/components/ui";

interface SocialAsset {
  id: string;
  title: string;
  asset_type: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
}

interface OrgBrand {
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
}

const TEMPLATE_CATEGORIES = [
  {
    label: "Mixer recap",
    items: [
      { title: "Carousel caption", content: "Last night was one for the books. Swipe for highlights from our mixer with [partner org]. #Go[Letters]" },
      { title: "Story slides", content: "Slide 1: Save the date\nSlide 2: Location + time\nSlide 3: Dress code\nSlide 4: RSVP link in bio" },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { title: "Bid day caption", content: "Welcome home to our newest members. We cannot wait to build with you this semester." },
      { title: "Rush week reminder", content: "Rush events continue this week — check our story highlights for the full schedule." },
    ],
  },
  {
    label: "Philanthropy",
    items: [
      { title: "Fundraiser announcement", content: "We are raising funds for [cause]. Donate at the link in bio — every dollar counts." },
      { title: "Donor shoutout", content: "Thank you to everyone who supported our philanthropy week. You helped us exceed our goal." },
    ],
  },
];

const ASSET_TYPES = [
  { value: "template", label: "Caption / template" },
  { value: "story", label: "Story script" },
  { value: "banner", label: "Banner copy" },
  { value: "logo", label: "Brand note" },
];

export function SocialAssetsClient({ orgId, org }: { orgId: string; org: OrgBrand }) {
  const router = useRouter();
  const [tab, setTab] = useState("library");
  const [assets, setAssets] = useState<SocialAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [form, setForm] = useState({ title: "", assetType: "template", content: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/social-assets?org_id=${orgId}`);
    const data = await res.json();
    if (res.ok) setAssets(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAsset() {
    if (!form.title.trim()) return;
    const res = await fetch("/api/social-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        title: form.title,
        assetType: form.assetType,
        content: form.content,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not save asset");
      return;
    }
    toast.success("Saved to library");
    setSaveOpen(false);
    setForm({ title: "", assetType: "template", content: "" });
    load();
  }

  async function applyTemplateContent(title: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — copy manually from the preview");
    }
    router.push(`/social-calendar?caption=${encodeURIComponent(content.slice(0, 200))}&title=${encodeURIComponent(title)}`);
  }

  async function deleteAsset(id: string) {
    const res = await fetch(
      `/api/social-assets?id=${encodeURIComponent(id)}&org_id=${encodeURIComponent(orgId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error((data as { error?: string }).error ?? "Delete failed");
      return;
    }
    toast.success("Removed");
    load();
  }

  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { id: "library", label: "My library", count: assets.length },
          { id: "templates", label: "Starter templates" },
          { id: "brand", label: "Brand kit" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "brand" && (
        <Card>
          <CardHeader title="Brand kit" description={`${org.name} visual identity`} icon={<Palette size={16} />} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Brand colors</p>
              <div className="flex gap-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg border border-border" style={{ background: org.primary_color ?? "#059669" }} />
                  <p className="text-xs text-muted-foreground mt-1">Primary</p>
                  <p className="text-xs font-mono">{org.primary_color ?? "#059669"}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-lg border border-border" style={{ background: org.secondary_color ?? "#065f46" }} />
                  <p className="text-xs text-muted-foreground mt-1">Secondary</p>
                  <p className="text-xs font-mono">{org.secondary_color ?? "#065f46"}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Chapter logo</p>
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                  <ImageIcon size={20} className="text-muted-foreground" aria-hidden />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setSaveOpen(true)}>
              Save custom asset
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <Card key={cat.label} padding="sm">
                <p className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                  <Brush size={14} />
                  {cat.label}
                </p>
                <div className="space-y-2">
                  {cat.items.map((item) => (
                    <div key={item.title} className="flex items-start justify-between gap-2 border-t border-border pt-2 first:border-0 first:pt-0">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.content}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => applyTemplateContent(item.title, item.content)}>
                        Use
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "library" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setSaveOpen(true)}>
              Add to library
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Card key={i} className="h-20 animate-pulse bg-surface-2 border-0">&nbsp;</Card>)}</div>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={<Brush size={24} />}
              title="No saved assets yet"
              description="Save captions, story scripts, and Canva notes for your social chairs."
              action={<Button size="sm" onClick={() => setSaveOpen(true)}>Add first asset</Button>}
            />
          ) : (
            <div className="space-y-3">
              {assets.map((a) => (
                <Card key={a.id} padding="sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{a.title}</p>
                        <Badge label={a.asset_type} color="gray" />
                      </div>
                      {a.content && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{a.content}</p>
                      )}
                      {a.file_url && (
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-greek-600 hover:underline mt-1 inline-flex items-center gap-1">
                          <ExternalLink size={12} />
                          Open file
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {a.content && (
                        <Button size="sm" variant="secondary" icon={<Copy size={12} />} onClick={() => applyTemplateContent(a.title, a.content!)}>
                          Use
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" icon={<Trash2 size={12} />} onClick={() => deleteAsset(a.id)} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader title="Design tools" description="External tools for creating chapter content" icon={<Link size={16} />} />
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { name: "Canva", url: "https://canva.com" },
            { name: "Adobe Express", url: "https://express.adobe.com" },
            { name: "Unfold", url: "https://unfoldapp.com" },
          ].map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-border hover:border-greek-300 text-sm font-medium"
            >
              {tool.name}
            </a>
          ))}
        </div>
      </Card>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save to library"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={saveAsset} disabled={!form.title.trim()}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label="Type" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })} options={ASSET_TYPES} />
          <Textarea label="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-[120px]" placeholder="Caption, story script, or notes..." />
        </div>
      </Modal>
    </div>
  );
}
