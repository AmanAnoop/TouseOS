"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, BookOpen, Calendar, ClipboardList, DollarSign,
  Home, Image, Menu, MessageSquare, Shield, Trophy, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/payments", label: "Dues", icon: DollarSign },
  { href: "/comms", label: "Comms", icon: MessageSquare },
];

const GREEK_NAV = [
  { href: "/pnm", label: "PNM", icon: Bell },
  { href: "/social", label: "Social", icon: Image },
  { href: "/risk", label: "Risk", icon: Shield },
  { href: "/reports", label: "Reports", icon: BookOpen },
];

const SPORTS_NAV = [
  { href: "/tryouts", label: "Tryouts", icon: Trophy },
  { href: "/social", label: "Photos", icon: Image },
  { href: "/travel", label: "Travel", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BookOpen },
];

interface BottomNavProps {
  orgType: string;
  onMenuOpen: () => void;
}

export function BottomNav({ orgType, onMenuOpen }: BottomNavProps) {
  const pathname = usePathname();

  const extras =
    orgType === "fraternity" || orgType === "sorority"
      ? GREEK_NAV.slice(0, 2)
      : orgType === "club_sports"
        ? SPORTS_NAV.slice(0, 2)
        : [];

  const items = [...NAV.slice(0, 4), ...extras.slice(0, 1)];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border lg:hidden safe-area-bottom">
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-greek-600" : "text-muted-foreground",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={onMenuOpen}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Menu size={20} strokeWidth={1.75} />
          More
        </button>
      </div>
    </nav>
  );
}
