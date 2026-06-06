"use client";

import Link from "next/link";
import type { SidebarNavItemDef } from "@/lib/sidebar-navigation";
import { sidebarIcon } from "@/components/layout/sidebar-icons";

export function SidebarNavLink({
  item,
  active,
}: {
  item: SidebarNavItemDef;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="ds-sidebar-nav-item"
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
    >
      <span className="ds-sidebar-nav-icon" aria-hidden>
        {sidebarIcon(item.icon)}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className="type-label"
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: "color-mix(in srgb, var(--color-org-primary) 20%, transparent)",
            color: "var(--color-sidebar-text)",
            fontSize: 10,
            letterSpacing: 0,
            textTransform: "none",
          }}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}
