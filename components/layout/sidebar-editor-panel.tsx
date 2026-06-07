"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card } from "@/components/ui";
import type { ProductId } from "@/lib/org-product";
import { buildSidebarNavigation } from "@/lib/sidebar-navigation";
import {
  applySidebarPreferences,
  EMPTY_SIDEBAR_PRODUCT_PREFS,
  getProductSidebarPrefs,
  isProtectedNavHref,
  type SidebarProductPreferences,
} from "@/lib/sidebar-preferences";
import type { SidebarSectionDef } from "@/lib/sidebar-navigation";

function orderedSectionItems(
  section: SidebarSectionDef,
  prefs: SidebarProductPreferences,
) {
  const customOrder = prefs.sectionOrder[section.id];
  if (!customOrder?.length) return section.items;
  const orderMap = new Map(customOrder.map((href, index) => [href, index]));
  return [...section.items].sort((a, b) => {
    const ai = orderMap.has(a.href) ? orderMap.get(a.href)! : 10_000 + section.items.indexOf(a);
    const bi = orderMap.has(b.href) ? orderMap.get(b.href)! : 10_000 + section.items.indexOf(b);
    return ai - bi;
  });
}
import { sidebarIcon } from "@/components/layout/sidebar-icons";

export const SIDEBAR_PREFS_UPDATED_EVENT = "touseos:sidebar-preferences-updated";

interface SidebarEditorPanelProps {
  product: ProductId;
  unreadCount?: number;
  hasGreekMembership?: boolean;
  platformAdmin?: boolean;
  universityAdmin?: boolean;
  compact?: boolean;
}

export function SidebarEditorPanel({
  product,
  unreadCount = 0,
  hasGreekMembership = false,
  platformAdmin = false,
  universityAdmin = false,
  compact = false,
}: SidebarEditorPanelProps) {
  const [prefs, setPrefs] = useState<SidebarProductPreferences>({ ...EMPTY_SIDEBAR_PRODUCT_PREFS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvedPlatformAdmin, setResolvedPlatformAdmin] = useState(platformAdmin);
  const [resolvedUniversityAdmin, setResolvedUniversityAdmin] = useState(universityAdmin);

  useEffect(() => {
    setResolvedPlatformAdmin(platformAdmin);
    setResolvedUniversityAdmin(universityAdmin);
  }, [platformAdmin, universityAdmin]);

  useEffect(() => {
    fetch("/api/platform-admin/check")
      .then((r) => r.json())
      .then((d) => setResolvedPlatformAdmin(Boolean(d.ok)))
      .catch(() => setResolvedPlatformAdmin(false));
    fetch("/api/university-admin/check")
      .then((r) => r.json())
      .then((d) => setResolvedUniversityAdmin(Boolean(d.ok)))
      .catch(() => setResolvedUniversityAdmin(false));
  }, []);

  const defaultSections = useMemo(
    () =>
      buildSidebarNavigation(product, {
        unreadCount,
        hasGreekMembership,
        platformAdmin: resolvedPlatformAdmin,
        universityAdmin: resolvedUniversityAdmin,
      }),
    [product, unreadCount, hasGreekMembership, resolvedPlatformAdmin, resolvedUniversityAdmin],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/account/sidebar?product=${encodeURIComponent(product)}`);
    if (res.ok) {
      const data = await res.json();
      setPrefs(getProductSidebarPrefs(data.all ?? {}, product));
    }
    setLoading(false);
  }, [product]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleHidden(href: string) {
    if (isProtectedNavHref(href, product)) {
      toast.error("Home, profile, and settings links always stay visible");
      return;
    }
    setPrefs((prev) => {
      const hidden = new Set(prev.hiddenHrefs);
      if (hidden.has(href)) hidden.delete(href);
      else hidden.add(href);
      return { ...prev, hiddenHrefs: Array.from(hidden) };
    });
  }

  function moveItem(sectionId: string, href: string, direction: -1 | 1) {
    setPrefs((prev) => {
      const section = defaultSections.find((s) => s.id === sectionId);
      if (!section) return prev;

      const visibleHrefs = section.items
        .map((i) => i.href)
        .filter((h) => !prev.hiddenHrefs.includes(h) || isProtectedNavHref(h, product));

      const currentOrder = prev.sectionOrder[sectionId]?.length
        ? prev.sectionOrder[sectionId].filter((h) => visibleHrefs.includes(h))
        : [...visibleHrefs];

      for (const h of visibleHrefs) {
        if (!currentOrder.includes(h)) currentOrder.push(h);
      }

      const index = currentOrder.indexOf(href);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= currentOrder.length) return prev;

      const nextOrder = [...currentOrder];
      [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];

      return {
        ...prev,
        sectionOrder: { ...prev.sectionOrder, [sectionId]: nextOrder },
      };
    });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/account/sidebar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, preferences: prefs }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Could not save sidebar");
      return;
    }
    toast.success("Sidebar updated");
    window.dispatchEvent(new CustomEvent(SIDEBAR_PREFS_UPDATED_EVENT, { detail: { product } }));
  }

  async function reset() {
    setSaving(true);
    const res = await fetch(`/api/account/sidebar?product=${encodeURIComponent(product)}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Could not reset sidebar");
      return;
    }
    setPrefs({ ...EMPTY_SIDEBAR_PRODUCT_PREFS });
    toast.success("Sidebar reset to default");
    window.dispatchEvent(new CustomEvent(SIDEBAR_PREFS_UPDATED_EVENT, { detail: { product } }));
  }

  const previewSections = applySidebarPreferences(defaultSections, prefs, product);
  const hiddenCount = prefs.hiddenHrefs.filter((h) => !isProtectedNavHref(h, product)).length;

  if (loading) {
    return <Card className="h-32 animate-pulse bg-surface-2 border-0">&nbsp;</Card>;
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <p className="text-sm text-muted-foreground">
          Show, hide, and reorder sidebar links for your {product === "greek" ? "chapter" : product === "sports" ? "team" : "club"} view.
          Changes sync across devices.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={saving} onClick={save}>Save sidebar</Button>
        <Button size="sm" variant="secondary" icon={<RotateCcw size={14} />} loading={saving} onClick={reset}>
          Reset to default
        </Button>
        {hiddenCount > 0 && (
          <span className="text-xs text-muted-foreground self-center">{hiddenCount} hidden</span>
        )}
      </div>

      <div className="space-y-4">
        {defaultSections.map((section) => (
          <Card key={section.id} padding="sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{section.title}</p>
            <ul className="space-y-1">
              {orderedSectionItems(section, prefs).map((item) => {
                const hidden = prefs.hiddenHrefs.includes(item.href) && !isProtectedNavHref(item.href, product);
                const protectedItem = isProtectedNavHref(item.href, product);
                return (
                  <li
                    key={item.href}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${hidden ? "border-dashed border-border opacity-50" : "border-border"}`}
                  >
                    <span className="text-muted-foreground flex-shrink-0">{sidebarIcon(item.icon)}</span>
                    <span className="text-sm flex-1 min-w-0 truncate">{item.label}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-surface-2 text-muted-foreground"
                        aria-label="Move up"
                        onClick={() => moveItem(section.id, item.href, -1)}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-surface-2 text-muted-foreground"
                        aria-label="Move down"
                        onClick={() => moveItem(section.id, item.href, 1)}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-surface-2 text-muted-foreground disabled:opacity-40"
                        disabled={protectedItem}
                        aria-label={hidden ? "Show in sidebar" : "Hide from sidebar"}
                        onClick={() => toggleHidden(item.href)}
                      >
                        {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      <Card padding="sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Preview</p>
        <div className="rounded-lg bg-[var(--color-sidebar)] p-3 space-y-3">
          {previewSections.map((section) => (
            <div key={section.id}>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1 px-2">{section.title}</p>
              {section.items.map((item) => (
                <div key={item.href} className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80">
                  <span className="opacity-70">{sidebarIcon(item.icon)}</span>
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
