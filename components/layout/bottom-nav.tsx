"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, BookOpen, Calendar, ClipboardList, DollarSign,
  Home, Image, LayoutGrid, Menu, MessageSquare, Trophy, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { getProductId, productAccent } from "@/lib/org-product";

const BASE = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/payments", label: "Dues", icon: DollarSign },
];

const GREEK_EXTRAS = [
  { href: "/pnm", label: "PNM", icon: Bell },
  { href: "/social", label: "Social", icon: Image },
];

const SPORTS_EXTRAS = [
  { href: "/sports", label: "Team", icon: Trophy },
  { href: "/tryouts", label: "Tryouts", icon: Trophy },
  { href: "/travel", label: "Travel", icon: ClipboardList },
];

const CLUB_EXTRAS = [
  { href: "/club", label: "Club", icon: LayoutGrid },
  { href: "/club/membership", label: "Join", icon: Users },
  { href: "/comms", label: "Comms", icon: MessageSquare },
];

const ACTIVE_CLASS: Record<string, string> = {
  greek: "text-greek-600",
  sports: "text-sports-600",
  club: "text-club-600",
};

const BADGE_CLASS: Record<string, string> = {
  greek: "bg-greek-600",
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

  const extras =
    product === "greek"
      ? GREEK_EXTRAS
      : product === "sports"
        ? SPORTS_EXTRAS
        : product === "club"
          ? CLUB_EXTRAS
          : [];

  const homeHref = product === "sports" ? "/sports" : product === "club" ? "/club" : "/dashboard";
  const base = BASE.map((item) => (item.href === "/dashboard" ? { ...item, href: homeHref } : item));

  const items = [...base.slice(0, 3), ...extras.slice(0, 1)];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border lg:hidden safe-area-bottom">
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] text-[10px] font-medium transition-colors touch-manipulation",
                active ? ACTIVE_CLASS[accent] : "text-muted-foreground",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/reports"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] text-[10px] font-medium transition-colors touch-manipulation",
            pathname.startsWith("/reports") ? ACTIVE_CLASS[accent] : "text-muted-foreground",
          )}
        >
          <BookOpen size={20} strokeWidth={1.75} />
          Reports
        </Link>
        <button
          onClick={onMenuOpen}
          className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Menu size={20} strokeWidth={1.75} />
          More
          {unreadCount > 0 && (
            <span className={cn("absolute top-1.5 right-4 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none", BADGE_CLASS[accent])}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
