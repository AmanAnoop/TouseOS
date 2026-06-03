"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProductAccent } from "@/lib/org-product";

const ACTIVE: Record<ProductAccent, string> = {
  greek: "bg-primary/10 text-primary font-medium border border-primary/15",
  sports: "bg-sports-50 text-sports-700 font-medium dark:bg-sports-950/50 dark:text-sports-400",
  club: "bg-club-50 text-club-700 font-medium dark:bg-club-950/50 dark:text-club-400",
};

const BADGE: Record<ProductAccent, string> = {
  greek: "bg-primary",
  sports: "bg-sports-600",
  club: "bg-club-600",
};

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function SidebarNavLink({
  item,
  active,
  collapsed,
  accent,
}: {
  item: SidebarNavItem;
  active: boolean;
  collapsed: boolean;
  accent: ProductAccent;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active ? ACTIVE[accent] : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className={cn("text-xs text-white rounded-full px-1.5 py-0.5 leading-none", BADGE[accent])}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
