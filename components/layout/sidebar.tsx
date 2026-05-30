"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, BookOpen, Building, Calendar, ChevronDown,
  ClipboardList, DollarSign, FileText, Heart, Home, Image,
  LogOut, MessageSquare, Moon, Plus, Settings, Shield,
  Sun, Trophy, Users, Warehouse, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import type { Organization, Profile } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
  orgTypes?: string[];
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-greek-50 text-greek-700 font-medium dark:bg-greek-950/50 dark:text-greek-400"
          : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="text-xs bg-greek-600 text-white rounded-full px-1.5 py-0.5 leading-none">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

interface SidebarProps {
  org: Organization | null;
  orgs: Organization[];
  profile: Profile | null;
  orgType: string;
  onClose?: () => void;
  mobile?: boolean;
}

export function Sidebar({ org, orgs, profile, orgType, onClose, mobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [dark, setDark] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isSports = orgType === "club_sports";
  const isGreek = orgType === "fraternity" || orgType === "sorority";

  useEffect(() => {
    const pref = localStorage.getItem("theme");
    const isDark = pref === "dark" || (!pref && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const coreNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <Home size={18} /> },
    { href: "/roster", label: isSports ? "Team Roster" : "Member Roster", icon: <Users size={18} /> },
    { href: "/events", label: "Events", icon: <Calendar size={18} /> },
    { href: "/payments", label: "Dues & Payments", icon: <DollarSign size={18} /> },
    { href: "/budget", label: "Budget & Finance", icon: <BookOpen size={18} /> },
    { href: "/tasks", label: "Tasks", icon: <ClipboardList size={18} /> },
    { href: "/documents", label: "Documents", icon: <FileText size={18} /> },
    { href: "/comms", label: "Communications", icon: <MessageSquare size={18} /> },
  ];

  const greekNav: NavItem[] = [
    { href: "/pnm", label: "PNM Recruitment", icon: <Zap size={18} /> },
    { href: "/social", label: "Touse Social", icon: <Image size={18} /> },
    { href: "/risk", label: "Risk Management", icon: <Shield size={18} /> },
    { href: "/nme", label: "New Members", icon: <BookOpen size={18} /> },
    { href: "/standards", label: "Standards", icon: <ClipboardList size={18} /> },
    { href: "/housing", label: "Housing", icon: <Warehouse size={18} /> },
    { href: "/alumni", label: "Alumni CRM", icon: <Users size={18} /> },
    { href: "/philanthropy", label: "Philanthropy", icon: <Building size={18} /> },
    { href: "/interchapter", label: "ExecLink", icon: <Zap size={18} /> },
  ];

  const sportsNav: NavItem[] = [
    { href: "/tryouts", label: "Tryouts", icon: <Trophy size={18} /> },
    { href: "/social", label: "Photos & Social", icon: <Image size={18} /> },
    { href: "/waivers", label: "Waivers & Compliance", icon: <Shield size={18} /> },
    { href: "/travel", label: "Travel Management", icon: <Building size={18} /> },
    { href: "/equipment", label: "Equipment & Uniforms", icon: <Warehouse size={18} /> },
    { href: "/injuries", label: "Injury Reports", icon: <ClipboardList size={18} /> },
    { href: "/coaches", label: "Coaching Tools", icon: <Trophy size={18} /> },
    { href: "/philanthropy", label: "Fundraising", icon: <DollarSign size={18} /> },
  ];

  const profileNav: NavItem[] = [
    { href: "/profile", label: "My Profile", icon: <Users size={18} /> },
    ...(isGreek && org ? [{ href: "/greekmatch", label: "💚 GreekMatch", icon: <Heart size={18} /> }] : []),
  ];

  const bottomNav: NavItem[] = [
    { href: "/reports", label: "Reports", icon: <FileText size={18} /> },
    { href: "/transition", label: "Officer Binder", icon: <BookOpen size={18} /> },
    { href: "/vendors", label: "Vendor Memory", icon: <Building size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const featureNav = isGreek ? greekNav : isSports ? sportsNav : [];

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border",
        collapsed ? "w-16" : "w-64",
        "transition-[width] duration-200",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border min-h-[60px]">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-greek-600 flex items-center justify-center text-white font-bold text-xs">
              TO
            </div>
            <span className="font-bold text-sm text-foreground">TouseOS</span>
          </Link>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {mobile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
          {!mobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hidden lg:flex"
            >
              <ChevronDown
                size={16}
                className={cn("transition-transform", collapsed ? "rotate-270" : "rotate-90")}
              />
            </button>
          )}
        </div>
      </div>

      {/* Org switcher */}
      {!collapsed && org && (
        <div className="px-3 py-2 border-b border-border">
          <button
            onClick={() => setOrgOpen(!orgOpen)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-1 transition-colors text-left"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: org.primary_color }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{org.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{org.type.replace("_", " ")}</p>
            </div>
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform flex-shrink-0", orgOpen && "rotate-180")} />
          </button>
          {orgOpen && (
            <div className="mt-1 border border-border rounded-lg overflow-hidden bg-card shadow-card-md">
              {orgs.map((o) => (
                <Link
                  key={o.id}
                  href={`/org/${o.id}/dashboard`}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-surface-1 text-sm"
                  onClick={() => setOrgOpen(false)}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: o.primary_color }}
                  >
                    {o.name.slice(0, 1)}
                  </div>
                  <span className="truncate">{o.name}</span>
                </Link>
              ))}
              <Link
                href="/onboarding/create-org"
                className="flex items-center gap-2 px-3 py-2 hover:bg-surface-1 text-sm text-muted-foreground border-t border-border"
              >
                <Plus size={14} />
                New organization
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hide">
        {coreNav.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} collapsed={collapsed} />
        ))}

        {profileNav.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">You</p>
              </div>
            )}
            {profileNav.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} collapsed={collapsed} />
            ))}
          </>
        )}

                {featureNav.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isGreek ? "Greek Life" : "SportsOS"}
                </p>
              </div>
            )}
            {featureNav.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} collapsed={collapsed} />
            ))}
          </>
        )}

        {!collapsed && (
          <div className="px-3 pt-4 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
          </div>
        )}
        {bottomNav.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-1"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/notifications" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-1">
            <Bell size={16} />
          </Link>
          {!collapsed && (
            <button
              onClick={signOut}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-1"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {!collapsed && profile && (
          <Link href="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-1 transition-colors">
            <Avatar name={profile.full_name || "User"} src={profile.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{profile.full_name}</p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
