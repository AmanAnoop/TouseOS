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
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors",
        showLabel ? "px-2 py-1.5" : "p-1.5",
        className,
      )}
      title={count > 0 ? `${count} unread notifications` : "Notifications"}
    >
      <Bell size={iconSize} />
      {showLabel && <span className="text-xs font-medium">Notifications</span>}
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-greek-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
