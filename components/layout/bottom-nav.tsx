"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Camera,
  CheckSquare,
  Home,
  LayoutGrid,
  Plane,
  Settings,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { getProductId } from "@/lib/org-product";

interface BottomNavProps {
  orgType: string;
}

export function BottomNav({ orgType }: BottomNavProps) {
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadNotifications();
  const product = getProductId(orgType);

  const homeHref =
    product === "sports" ? "/sports" : product === "club" ? "/club" : "/dashboard";

  const items =
    product === "sports"
      ? [
          { href: homeHref, label: "Home", icon: Home },
          { href: "/events", label: "Events", icon: Calendar },
          { href: "/travel", label: "Travel", icon: Plane },
          { href: "/waivers", label: "Waivers", icon: Shield },
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
            { href: "/events", label: "Events", icon: Calendar },
            { href: "/social", label: "Photos", icon: Camera },
            { href: "/payments", label: "Pay", icon: LayoutGrid },
            { href: "/tasks", label: "Tasks", icon: CheckSquare },
          ];

  return (
    <nav className="ds-bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="ds-bottom-nav-item"
            data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/settings"
        className="ds-bottom-nav-item"
        data-active={pathname.startsWith("/settings") ? "true" : "false"}
        aria-label={unreadCount > 0 ? `Settings, ${unreadCount} notifications` : "Settings"}
      >
        <Settings size={20} strokeWidth={1.75} aria-hidden />
        Settings
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: "20%",
              minWidth: 16,
              height: 16,
              borderRadius: 4,
              background: "var(--color-org-primary)",
              color: "var(--color-text-on-brand)",
              fontSize: 10,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </nav>
  );
}
