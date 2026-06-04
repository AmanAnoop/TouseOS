"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

interface NotificationBellProps {
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
}

export function NotificationBell({ className, iconSize = 16, showLabel }: NotificationBellProps) {
  const { count } = useUnreadNotifications();

  return (
    <Link
      href="/notifications"
      className={cn("ds-btn ds-btn-ghost ds-btn-icon relative", className)}
      title={count > 0 ? `${count} unread notifications` : "Notifications"}
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      style={{ color: "rgba(247,246,243,0.65)" }}
    >
      <Bell size={iconSize} aria-hidden />
      {showLabel && <span className="type-small">Notifications</span>}
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 4,
            background: "var(--color-org-primary)",
            color: "var(--color-text-inverse)",
            fontSize: 10,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
