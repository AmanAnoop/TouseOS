"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell, BookOpen, Building, Calendar, ChevronDown,
  ClipboardList, DollarSign, FileText, Heart, Home, Image,
  LogOut, MessageSquare, Plus, Settings, Shield,
  Trophy, Users, Warehouse, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
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
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
        active
          ? "bg-sidebar-active text-white font-medium shadow-sm border-l-2 border-gold pl-[10px]"
          : "text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent",
        collapsed && "justify-center px-2 border-l-0 pl-2",
      )}
    >
      <span className={cn("w-5 h-5 flex-shrink-0", active ? "text-gold opacity-100" : "opacity-70")}>{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="text-xs bg-gold text-navy font-semibold rounded-full px-1.5 py-0.5 leading-none">
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
  const [orgOpen, setOrgOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { count: unreadCount } = useUnreadNotifications();

  const isSports = orgType === "club_sports";
  const isGreek = orgType === "fraternity" || orgType === "sorority";

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const coreNav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <Home size={18} /> },
    { href: "/health", label: "Health Score", icon: <Heart size={18} /> },
    { href: "/roster", label: isSports ? "Team Roster" : "Member Roster", icon: <Users size={18} /> },
    { href: "/events", label: "Events", icon: <Calendar size={18} /> },
    { href: "/payments", label: "Dues & Payments", icon: <DollarSign size={18} /> },
    { href: "/reimbursements", label: "Reimbursements", icon: <DollarSign size={18} /> },
    { href: "/budget", label: "Budget & Finance", icon: <BookOpen size={18} /> },
    { href: "/tasks", label: "Tasks", icon: <ClipboardList size={18} /> },
    { href: "/documents", label: "Documents", icon: <FileText size={18} /> },
    { href: "/forms", label: "Forms & Waivers", icon: <ClipboardList size={18} /> },
    { href: "/governance", label: "Governance", icon: <BookOpen size={18} /> },
    { href: "/attendance-points", label: "Points System", icon: <Trophy size={18} /> },
    { href: "/engagement", label: "Engagement", icon: <Heart size={18} /> },
    { href: "/comms", label: "Communications", icon: <MessageSquare size={18} /> },
    { href: "/feed", label: "Chapter Feed", icon: <Zap size={18} /> },
  ];

  const greekNav: NavItem[] = [
    { href: "/pnm", label: "PNM Recruitment", icon: <Zap size={18} /> },
    { href: "/big-little", label: "Big/Little", icon: <Heart size={18} /> },
    { href: "/social", label: "Touse Social", icon: <Image size={18} /> },
    { href: "/social-calendar", label: "Social Calendar", icon: <Calendar size={18} /> },
    { href: "/social-assets", label: "Asset Library", icon: <Image size={18} /> },
    { href: "/risk", label: "Risk Management", icon: <Shield size={18} /> },
    { href: "/nme", label: "New Members", icon: <BookOpen size={18} /> },
    { href: "/standards", label: "Standards", icon: <ClipboardList size={18} /> },
    { href: "/housing", label: "Housing", icon: <Warehouse size={18} /> },
    { href: "/alumni", label: "Alumni CRM", icon: <Users size={18} /> },
    { href: "/philanthropy", label: "Philanthropy", icon: <Building size={18} /> },
    { href: "/interchapter", label: "ExecLink", icon: <Zap size={18} /> },
    { href: "/event-memories", label: "Memories", icon: <Calendar size={18} /> },
  ];

  const sportsNav: NavItem[] = [
    { href: "/tryouts", label: "Tryouts", icon: <Trophy size={18} /> },
    { href: "/tournaments", label: "Tournaments", icon: <Trophy size={18} /> },
    { href: "/standings", label: "League Standings", icon: <Trophy size={18} /> },
    { href: "/social", label: "Photos & Social", icon: <Image size={18} /> },
    { href: "/yearbook", label: "Yearbook", icon: <BookOpen size={18} /> },
    { href: "/waivers", label: "Waivers & Compliance", icon: <Shield size={18} /> },
    { href: "/travel", label: "Travel Management", icon: <Building size={18} /> },
    { href: "/equipment", label: "Equipment & Uniforms", icon: <Warehouse size={18} /> },
    { href: "/injuries", label: "Injury Reports", icon: <ClipboardList size={18} /> },
    { href: "/coaches", label: "Coaching Tools", icon: <Trophy size={18} /> },
    { href: "/philanthropy", label: "Fundraising", icon: <DollarSign size={18} /> },
  ];

  const profileNav: NavItem[] = [
    { href: "/profile", label: "My Profile", icon: <Users size={18} /> },
    { href: "/account", label: "Account & Security", icon: <Settings size={18} /> },
    { href: "/notifications", label: "Notifications", icon: <Bell size={18} />, badge: unreadCount },
    ...(isGreek && org ? [{ href: "/greekmatch", label: "💚 GreekMatch", icon: <Heart size={18} /> }] : []),
  ];

  const bottomNav: NavItem[] = [
    { href: "/reports", label: "Reports", icon: <FileText size={18} /> },
    { href: "/transition", label: "Officer Binder", icon: <BookOpen size={18} /> },
    { href: "/vendors", label: "Vendor Memory", icon: <Building size={18} /> },
    { href: "/ai-assistant", label: "AI Assistant ✨", icon: <Zap size={18} /> },
    { href: "/admin", label: "Admin Dashboard", icon: <Settings size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const featureNav = isGreek ? greekNav : isSports ? sportsNav : [];

  return (
    <aside
      className={cn(
        "regal-sidebar flex flex-col h-full text-white",
        collapsed ? "w-16" : "w-64",
        "transition-[width] duration-200",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 min-h-[60px]">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gold/20 border border-gold/40 flex items-center justify-center text-gold font-display font-bold text-sm">
              T
            </div>
            <span className="font-display text-lg font-semibold text-white tracking-wide">TouseOS</span>
          </Link>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {mobile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-white/60 hover:text-gold hover:bg-white/5"
            >
              <X size={18} />
            </button>
          )}
          {!mobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-white/60 hover:text-gold hover:bg-white/5 hidden lg:flex"
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
        <div className="px-3 py-2 border-b border-white/10">
          <button
            onClick={() => setOrgOpen(!orgOpen)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: org.primary_color }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{org.name}</p>
              <p className="text-xs text-white/50 capitalize">{org.type.replace("_", " ")}</p>
            </div>
            <ChevronDown size={14} className={cn("text-white/50 transition-transform flex-shrink-0", orgOpen && "rotate-180")} />
          </button>
          {orgOpen && (
            <div className="mt-1 border border-white/10 rounded-lg overflow-hidden bg-navy shadow-card-md">
              {orgs.map((o) => (
                <Link
                  key={o.id}
                  href={`/org/${o.id}/dashboard`}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-sm text-white/90"
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
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-sm text-white/60 border-t border-white/10"
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
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gold/80">You</p>
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
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gold/80">
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
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold/80">
              Admin
            </p>
          </div>
        )}
        {bottomNav.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <NotificationBell />
          {!collapsed && (
            <button
              onClick={signOut}
              className="ml-auto p-1.5 rounded-md text-white/60 hover:text-gold hover:bg-white/5"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {!collapsed && profile && (
          <Link href="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <Avatar name={profile.full_name || "User"} src={profile.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/90 truncate">{profile.full_name}</p>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
