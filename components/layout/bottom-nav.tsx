"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Home,
  LayoutGrid,
  Menu,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { getProductId, productAccent } from "@/lib/org-product";

const ACTIVE_CLASS: Record<string, string> = {
  greek: "text-primary",
  sports: "text-sports-600",
  club: "text-club-600",
};

const BADGE_CLASS: Record<string, string> = {
  greek: "bg-primary",
  sports: "bg-sports-600",
  club: "bg-club-600",
};

interface BottomNavProps {
  orgType: string;
  onMenuOpen: () => void;
}

export function BottomNav({ orgType, onMenuOpen }: BottomNavProps) {
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadNotifications();
  const product = getProductId(orgType);
  const accent = productAccent(product);

  const homeHref =
    product === "sports" ? "/sports" : product === "club" ? "/club" : "/dashboard";

  const items =
    product === "sports"
      ? [
          { href: homeHref, label: "Home", icon: Home },
          { href: "/roster", label: "Roster", icon: Users },
          { href: "/events", label: "Events", icon: Calendar },
          { href: "/tryouts", label: "Tryouts", icon: Trophy },
        ]
      : product === "club"
        ? [
            { href: homeHref, label: "Home", icon: Home },
            { href: "/roster", label: "Roster", icon: Users },
            { href: "/events", label: "Events", icon: Calendar },
            { href: "/club", label: "Club", icon: LayoutGrid },
          ]
        : [
            { href: homeHref, label: "Home", icon: Home },
            { href: "/roster", label: "Roster", icon: Users },
            { href: "/events", label: "Events", icon: Calendar },
            { href: "/payments", label: "Dues", icon: DollarSign },
          ];

  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/98 backdrop-blur-md lg:hidden">
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[52px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? ACTIVE_CLASS[accent] : "text-muted-foreground",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/reports"
          className={cn(
            "flex min-h-[52px] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
            pathname.startsWith("/reports")
              ? ACTIVE_CLASS[accent]
              : "text-muted-foreground",
          )}
        >
          <BarChart3 size={20} strokeWidth={1.75} />
          Reports
        </Link>
        <button
          type="button"
          onClick={onMenuOpen}
          className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Menu size={20} strokeWidth={1.75} />
          Menu
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute right-4 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white",
                BADGE_CLASS[accent],
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
