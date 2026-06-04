"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, LogOut, Plus, Settings, X } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import type { Organization, Profile } from "@/types";
import { getProductId, productLabel, productHomePath } from "@/lib/org-product";
import { homePathForOrgType } from "@/lib/resolve-home";
import { buildSidebarNavigation } from "@/lib/sidebar-navigation";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { pickReadableTextColor } from "@/lib/color-utils";

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
  const [orgOpen, setOrgOpen] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [universityAdmin, setUniversityAdmin] = useState(false);
  const { count: unreadCount } = useUnreadNotifications();
  const supabase = createClient();

  const product = getProductId(orgType);
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

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="ds-sidebar h-full">
      <div className="ds-sidebar-logo">
        <Link
          href={productHomePath(product)}
          className="flex items-center gap-3"
          style={{ gap: 12, textDecoration: "none", color: "var(--color-text-inverse)" }}
        >
          <div
            className="ds-brand-mark flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {product === "sports" ? "SP" : product === "club" ? "CL" : "TO"}
          </div>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{productLabel(product)}</span>
        </Link>
        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ds-btn ds-btn-ghost ds-btn-icon"
            style={{ marginLeft: "auto", color: "rgba(247,246,243,0.65)" }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {org && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            type="button"
            onClick={() => setOrgOpen(!orgOpen)}
            className="w-full flex items-center gap-3 text-left"
            style={{
              gap: 12,
              padding: "8px",
              borderRadius: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-inverse)",
            }}
          >
            <div
              className="ds-brand-mark"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {org.name}
              </p>
              <p style={{ fontSize: 11, margin: 0, opacity: 0.5 }}>{org.campus ?? productLabel(product)}</p>
            </div>
            <ChevronDown
              size={14}
              style={{
                opacity: 0.5,
                transform: orgOpen ? "rotate(180deg)" : "none",
                transition: "transform 120ms ease",
              }}
            />
          </button>
          {orgOpen && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={switchingOrg}
                  onClick={() => switchOrg(o)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                    background: o.id === org.id ? "rgba(255,255,255,0.06)" : "transparent",
                    border: "none",
                    color: "var(--color-text-inverse)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      background: o.primary_color ?? "var(--color-org-primary)",
                      color: pickReadableTextColor(o.primary_color ?? "#500000"),
                    }}
                  >
                    {o.name.slice(0, 1)}
                  </span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.name}
                  </span>
                </button>
              ))}
              <Link
                href="/onboarding/create-org"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "rgba(247,246,243,0.65)",
                  textDecoration: "none",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Plus size={14} />
                New organization
              </Link>
            </div>
          )}
        </div>
      )}

      <nav className="scrollbar-hide flex-1 overflow-y-auto py-8">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="ds-sidebar-section-label">{section.title}</p>
            {section.items.map((item) => (
              <SidebarNavLink
                key={`${section.id}-${item.href}`}
                item={item}
                active={isActive(item.href)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="ds-sidebar-footer">
        <ThemeToggle variant="sidebar" />
        <NotificationBell
          className="ds-btn ds-btn-ghost ds-btn-icon"
          iconSize={16}
        />
        <Link
          href="/settings"
          className="ds-btn ds-btn-ghost ds-btn-icon"
          style={{ color: "rgba(247,246,243,0.65)" }}
          aria-label="Settings"
        >
          <Settings size={16} />
        </Link>
        {profile && (
          <Link
            href="/profile"
            className="flex items-center gap-2 flex-1 min-w-0"
            style={{ textDecoration: "none", color: "var(--color-text-inverse)" }}
          >
            <Avatar name={profile.full_name || "User"} src={profile.avatar_url} size="sm" variant="chrome" />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {profile.full_name}
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className="ds-btn ds-btn-ghost ds-btn-icon"
          style={{ color: "rgba(247,246,243,0.65)" }}
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
