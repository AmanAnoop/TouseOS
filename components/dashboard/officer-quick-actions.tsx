"use client";

import Link from "next/link";
import {
  Calendar, DollarSign, Megaphone, Shield, UserPlus, Users,
} from "lucide-react";
import { Card } from "@/components/ui";
import { isGreekOrg, isSportsOrg } from "@/lib/utils";

const OFFICER_ROLES = new Set([
  "owner", "president", "vice_president", "treasurer", "secretary",
  "social_chair", "recruitment_chair", "risk_manager", "advisor", "captain", "coach",
]);

export function OfficerQuickActions({
  role,
  orgType,
}: {
  role: string;
  orgType: string;
}) {
  if (!OFFICER_ROLES.has(role)) return null;

  const links = [
    { href: "/events/new", label: "New event", icon: <Calendar size={18} /> },
    { href: "/payments", label: "Payments", icon: <DollarSign size={18} /> },
    { href: "/comms", label: "Announce", icon: <Megaphone size={18} /> },
    { href: "/roster", label: "Roster", icon: <Users size={18} /> },
    { href: "/risk", label: "Risk", icon: <Shield size={18} /> },
  ];

  if (isGreekOrg(orgType)) {
    links.push({ href: "/pnm", label: "PNM", icon: <UserPlus size={18} /> });
    links.push({ href: "/interchapter", label: "ExecLink", icon: <Users size={18} /> });
  }

  if (isSportsOrg(orgType)) {
    links.push({ href: "/travel", label: "Travel", icon: <Calendar size={18} /> });
  }

  return (
    <Card padding="sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Officer shortcuts</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border border-border bg-surface-1 hover:border-greek-300 hover:bg-greek-50/50 dark:hover:bg-greek-950/20 transition-colors touch-manipulation p-2"
          >
            <span className="text-greek-600">{item.icon}</span>
            <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
