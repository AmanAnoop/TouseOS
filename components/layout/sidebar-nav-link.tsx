"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductAccent } from "@/lib/org-product";
import type { SidebarNavItemDef } from "@/lib/sidebar-navigation";
import { sidebarIcon } from "@/components/layout/sidebar-icons";

export function SidebarNavLink({
  item,
  active,
  collapsed,
  accent,
}: {
  item: SidebarNavItemDef;
  active: boolean;
  collapsed: boolean;
  accent: ProductAccent;
}) {
  const accentBar =
    accent === "sports"
      ? "bg-sports-600"
      : accent === "club"
        ? "bg-club-600"
        : "bg-primary";

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg text-[13px] transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "px-2.5 py-2",
        active
          ? "bg-surface-1 text-foreground font-medium"
          : "text-muted-foreground hover:bg-surface-1/80 hover:text-foreground",
      )}
    >
      {active && !collapsed && (
        <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full", accentBar)} />
      )}
      <span
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors",
          active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {sidebarIcon(item.icon)}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate leading-tight">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="min-w-[1.25rem] rounded-md bg-primary px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-primary-foreground">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
