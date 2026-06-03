"use client";

import Link from "next/link";
import {
  Calendar, DollarSign, HandHeart, Megaphone, Shield, UserPlus, Users,
} from "lucide-react";
import { Card } from "@/components/ui";
import { getProductId, productAccent } from "@/lib/org-product";

import { isDashboardOfficer } from "@/lib/dashboard-roles";

const HOVER: Record<string, string> = {
  greek: "hover:border-greek-300 hover:bg-greek-50/50 dark:hover:bg-greek-950/20",
  sports: "hover:border-sports-300 hover:bg-sports-50/50 dark:hover:bg-sports-950/20",
  club: "hover:border-club-300 hover:bg-club-50/50 dark:hover:bg-club-950/20",
};

const ICON: Record<string, string> = {
  greek: "text-greek-600",
  sports: "text-sports-600",
  club: "text-club-600",
};

export function OfficerQuickActions({
  role,
  orgType,
}: {
  role: string;
  orgType: string;
}) {
  if (!isDashboardOfficer(role)) return null;

  const product = getProductId(orgType);
  const accent = productAccent(product);

  const links = [
    { href: "/events/new", label: "New event", icon: <Calendar size={18} /> },
    { href: "/payments", label: "Payments", icon: <DollarSign size={18} /> },
    { href: "/comms", label: "Announce", icon: <Megaphone size={18} /> },
    { href: "/roster", label: "Roster", icon: <Users size={18} /> },
  ];

  if (product === "greek") {
    links.push({ href: "/risk", label: "Risk", icon: <Shield size={18} /> });
    links.push({ href: "/pnm", label: "PNM", icon: <UserPlus size={18} /> });
    links.push({ href: "/interchapter", label: "ExecLink", icon: <Users size={18} /> });
  }

  if (product === "sports") {
    links.push({ href: "/travel", label: "Travel", icon: <Calendar size={18} /> });
    links.push({ href: "/tryouts", label: "Tryouts", icon: <Users size={18} /> });
    links.push({ href: "/waivers", label: "Waivers", icon: <Shield size={18} /> });
  }

  if (product === "club") {
    links.push({ href: "/club/membership", label: "Membership", icon: <UserPlus size={18} /> });
    links.push({ href: "/club/service-hours", label: "Service hrs", icon: <HandHeart size={18} /> });
    links.push({ href: "/club/committees", label: "Committees", icon: <Users size={18} /> });
  }

  return (
    <Card padding="sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Officer shortcuts</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border border-border bg-surface-1 transition-colors touch-manipulation p-2 ${HOVER[accent]}`}
          >
            <span className={ICON[accent]}>{item.icon}</span>
            <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
