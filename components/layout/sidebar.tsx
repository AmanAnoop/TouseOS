"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, LogOut, Moon, Plus, Sun, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import type { Organization, Profile } from "@/types";
import {
  getProductId,
  productAccent,
  productLabel,
  productHomePath,
} from "@/lib/org-product";
import { homePathForOrgType } from "@/lib/resolve-home";
import { buildSidebarNavigation } from "@/lib/sidebar-navigation";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";

interface SidebarProps {
  org: Organization | null;
  orgs: Organization[];
  profile: Profile | null;
  orgType: string;
  onClose?: () => void;
  mobile?: boolean;
}

export function Sidebar({ org, orgs, profile, orgType, onClose, mobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [switchingOrg, setSwitchingOrg] = useState(false);

  async function switchOrg(target: Organization) {
    if (target.id === org?.id || switchingOrg) return;
    setSwitchingOrg(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not switch organization");
        return;
      }
      setOrgOpen(false);
      router.push(data.redirectTo ?? homePathForOrgType(target.type));
      router.refresh();
    } finally {
      setSwitchingOrg(false);
    }
  }

  const supabase = createClient();
  const [dark, setDark] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [universityAdmin, setUniversityAdmin] = useState(false);
  const { count: unreadCount } = useUnreadNotifications();

  const product = getProductId(orgType);
  const accent = productAccent(product);
  const hasGreekMembership = orgs.some(
    (o) => o.type === "fraternity" || o.type === "sorority",
  );

  const sections = useMemo(
    () =>
      buildSidebarNavigation(product, {
        unreadCount,
        hasGreekMembership,
        platformAdmin,
        universityAdmin,
      }),
    [product, unreadCount, hasGreekMembership, platformAdmin, universityAdmin],
  );

  const logoBg =
    accent === "sports" ? "bg-sports-600" : accent === "club" ? "bg-club-600" : "bg-primary";

  useEffect(() => {
    const pref = localStorage.getItem("theme");
    const isDark =
      pref === "dark" || (!pref && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    fetch("/api/platform-admin/check")
      .then((r) => r.json())
      .then((d) => setPlatformAdmin(Boolean(d.ok)))
      .catch(() => setPlatformAdmin(false));
    fetch("/api/university-admin/check")
      .then((r) => r.json())
      .then((d) => setUniversityAdmin(Boolean(d.ok)))
      .catch(() => setUniversityAdmin(false));
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-card",
        collapsed ? "w-[4.25rem]" : "w-64",
        "transition-[width] duration-200",
      )}
    >
      <div className="flex min-h-[60px] items-center justify-between border-b border-border p-4">
        {!collapsed && (
          <Link href={productHomePath(product)} className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold text-white",
                logoBg,
              )}
            >
              {product === "sports" ? "SP" : product === "club" ? "CL" : "TG"}
            </div>
            <span className="text-sm font-semibold text-foreground">{productLabel(product)}</span>
          </Link>
        )}
        <div className="ml-auto flex items-center gap-1">
          {mobile && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
          {!mobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-foreground lg:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronDown
                size={16}
                className={cn("transition-transform", collapsed ? "rotate-270" : "rotate-90")}
              />
            </button>
          )}
        </div>
      </div>

      {!collapsed && org && (
        <div className="border-b border-border px-3 py-2.5">
          <button
            onClick={() => setOrgOpen(!orgOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-1"
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
              style={{ background: org.primary_color }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{org.name}</p>
              <p className="text-[11px] text-muted-foreground">{productLabel(product)}</p>
            </div>
            <ChevronDown
              size={14}
              className={cn(
                "flex-shrink-0 text-muted-foreground transition-transform",
                orgOpen && "rotate-180",
              )}
            />
          </button>
          {orgOpen && (
            <div className="mt-1.5 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={switchingOrg}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-1 disabled:opacity-50"
                  onClick={() => switchOrg(o)}
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white"
                    style={{ background: o.primary_color }}
                  >
                    {o.name.slice(0, 1)}
                  </div>
                  <span className="truncate">{o.name}</span>
                  {o.id === org?.id && (
                    <span className="ml-auto text-[10px] text-muted-foreground">Active</span>
                  )}
                </button>
              ))}
              <Link
                href="/onboarding/create-org"
                className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm text-muted-foreground hover:bg-surface-1"
              >
                <Plus size={14} />
                New organization
              </Link>
            </div>
          )}
        </div>
      )}

      <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.id} className="mb-1">
            {!collapsed && (
              <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90 first:pt-1">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <SidebarNavLink
                key={`${section.id}-${item.href}`}
                item={item}
                active={isActive(item.href)}
                collapsed={collapsed}
                accent={accent}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-foreground"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <NotificationBell />
          {!collapsed && (
            <button
              onClick={signOut}
              className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {!collapsed && profile && (
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-1"
          >
            <Avatar name={profile.full_name || "User"} src={profile.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{profile.full_name}</p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
