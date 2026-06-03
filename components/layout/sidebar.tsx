"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Bell, BookOpen, Building, Calendar, ChevronDown,
  ClipboardList, DollarSign, FileText, GraduationCap, Heart, Home, Image,
  LogOut, MessageSquare, Moon, Plus, Settings, Shield,
  Sun, Trophy, Users, Warehouse, X, Zap, HandHeart, LayoutGrid,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import type { Organization, Profile } from "@/types";
import {
  getProductId,
  navForProduct,
  productAccent,
  productLabel,
  productHomePath,
} from "@/lib/org-product";
import { homePathForOrgType } from "@/lib/resolve-home";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";

const ICONS: Record<string, React.ReactNode> = {
  "/dashboard": <Home size={18} />,
  "/health": <Heart size={18} />,
  "/roster": <Users size={18} />,
  "/events": <Calendar size={18} />,
  "/payments": <DollarSign size={18} />,
  "/reimbursements": <DollarSign size={18} />,
  "/budget": <BookOpen size={18} />,
  "/tasks": <ClipboardList size={18} />,
  "/documents": <FileText size={18} />,
  "/forms": <ClipboardList size={18} />,
  "/governance": <BookOpen size={18} />,
  "/attendance-points": <Trophy size={18} />,
  "/engagement": <Heart size={18} />,
  "/comms": <MessageSquare size={18} />,
  "/feed": <Zap size={18} />,
  "/pnm": <Zap size={18} />,
  "/big-little": <Heart size={18} />,
  "/social": <Image size={18} />,
  "/social-calendar": <Calendar size={18} />,
  "/social-collab": <Users size={18} />,
  "/social-assets": <Image size={18} />,
  "/risk": <Shield size={18} />,
  "/nme": <BookOpen size={18} />,
  "/standards": <ClipboardList size={18} />,
  "/housing": <Warehouse size={18} />,
  "/alumni": <Users size={18} />,
  "/philanthropy": <Building size={18} />,
  "/interchapter": <Zap size={18} />,
  "/event-memories": <Calendar size={18} />,
  "/sports": <Trophy size={18} />,
  "/tryouts": <Trophy size={18} />,
  "/tournaments": <Trophy size={18} />,
  "/standings": <Trophy size={18} />,
  "/yearbook": <BookOpen size={18} />,
  "/waivers": <Shield size={18} />,
  "/travel": <Building size={18} />,
  "/equipment": <Warehouse size={18} />,
  "/injuries": <ClipboardList size={18} />,
  "/coaches": <Trophy size={18} />,
  "/club": <LayoutGrid size={18} />,
  "/club/membership": <UserPlusIcon />,
  "/club/committees": <Users size={18} />,
  "/club/service-hours": <HandHeart size={18} />,
  "/club/elections": <Users size={18} />,
  "/profile": <Users size={18} />,
  "/account": <Settings size={18} />,
  "/notifications": <Bell size={18} />,
  "/greekmatch": <Heart size={18} />,
  "/reports": <FileText size={18} />,
  "/transition": <BookOpen size={18} />,
  "/vendors": <Building size={18} />,
  "/ai-assistant": <Zap size={18} />,
  "/admin": <Settings size={18} />,
  "/platform-admin": <Shield size={18} />,
  "/university-admin": <GraduationCap size={18} />,
  "/settings": <Settings size={18} />,
};

function UserPlusIcon() {
  return <Users size={18} />;
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
  const [switchingOrg, setSwitchingOrg] = useState(false);

  async function switchOrg(target: Organization) {
    if (target.id === org?.id || switchingOrg) return;
    setSwitchingOrg(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not switch organization");
        return;
      }
      setOrgOpen(false);
      router.push(data.redirectTo ?? homePathForOrgType(target.type));
      router.refresh();
    } finally {
      setSwitchingOrg(false);
    }
  }

  const supabase = createClient();
  const [dark, setDark] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [universityAdmin, setUniversityAdmin] = useState(false);
  const { count: unreadCount } = useUnreadNotifications();

  const product = getProductId(orgType);
  const accent = productAccent(product);
  const isGreek = product === "greek";
  const { core, feature, featureSectionTitle } = navForProduct(product);

  const coreNav = useMemo(
    () => core.map((i) => ({ href: i.href, label: i.label, icon: ICONS[i.href] ?? <Home size={18} /> })),
    [core],
  );
  const featureNav = useMemo(
    () => feature.map((i) => ({ href: i.href, label: i.label, icon: ICONS[i.href] ?? <Zap size={18} /> })),
    [feature],
  );

  const logoBg =
    accent === "sports" ? "bg-sports-600" : accent === "club" ? "bg-club-600" : "bg-primary";

  useEffect(() => {
    const pref = localStorage.getItem("theme");
    const isDark = pref === "dark" || (!pref && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    fetch("/api/platform-admin/check")
      .then((r) => r.json())
      .then((d) => setPlatformAdmin(Boolean(d.ok)))
      .catch(() => setPlatformAdmin(false));
    fetch("/api/university-admin/check")
      .then((r) => r.json())
      .then((d) => setUniversityAdmin(Boolean(d.ok)))
      .catch(() => setUniversityAdmin(false));
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

  const profileNav = [
    { href: "/profile", label: "My Profile", icon: ICONS["/profile"] },
    { href: "/account", label: "Account & Security", icon: ICONS["/account"] },
    { href: "/notifications", label: "Notifications", icon: ICONS["/notifications"], badge: unreadCount },
    ...(isGreek && org ? [{ href: "/greekmatch", label: "💚 GreekMatch", icon: ICONS["/greekmatch"] }] : []),
  ];

  const bottomNav = [
    { href: "/reports", label: "Reports", icon: ICONS["/reports"] },
    { href: "/transition", label: product === "sports" ? "Captain Binder" : product === "club" ? "Officer Binder" : "Officer Binder", icon: ICONS["/transition"] },
    { href: "/vendors", label: "Vendor Memory", icon: ICONS["/vendors"] },
    { href: "/ai-assistant", label: "AI Assistant ✨", icon: ICONS["/ai-assistant"] },
    { href: "/admin", label: "Admin Dashboard", icon: ICONS["/admin"] },
    ...(platformAdmin ? [{ href: "/platform-admin", label: "Platform admin", icon: ICONS["/platform-admin"] }] : []),
    ...(universityAdmin ? [{ href: "/university-admin", label: "University admin", icon: ICONS["/university-admin"] }] : []),
    { href: "/settings", label: "Settings", icon: ICONS["/settings"] },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border",
        collapsed ? "w-16" : "w-64",
        "transition-[width] duration-200",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border min-h-[60px]">
        {!collapsed && (
          <Link href={productHomePath(product)} className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs", logoBg)}>
              {product === "sports" ? "SP" : product === "club" ? "CL" : "TG"}
            </div>
            <span className="font-bold text-sm text-foreground">{productLabel(product)}</span>
          </Link>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {mobile && (
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
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
              <p className="text-xs text-muted-foreground">{productLabel(product)}</p>
            </div>
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform flex-shrink-0", orgOpen && "rotate-180")} />
          </button>
          {orgOpen && (
            <div className="mt-1 border border-border rounded-lg overflow-hidden bg-card shadow-card-md">
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={switchingOrg}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-1 text-sm text-left disabled:opacity-50"
                  onClick={() => switchOrg(o)}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: o.primary_color }}
                  >
                    {o.name.slice(0, 1)}
                  </div>
                  <span className="truncate">{o.name}</span>
                  {o.id === org?.id && <span className="text-[10px] text-muted-foreground ml-auto">Active</span>}
                </button>
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

      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hide">
        {coreNav.map((item) => (
          <SidebarNavLink key={`${item.href}-${item.label}`} item={item} active={isActive(item.href)} collapsed={collapsed} accent={accent} />
        ))}

        {profileNav.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">You</p>
              </div>
            )}
            {profileNav.map((item) => (
              <SidebarNavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} accent={accent} />
            ))}
          </>
        )}

        {featureNav.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {featureSectionTitle}
                </p>
              </div>
            )}
            {featureNav.map((item) => (
              <SidebarNavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} accent={accent} />
            ))}
          </>
        )}

        {!collapsed && (
          <div className="px-3 pt-4 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
          </div>
        )}
        {bottomNav.map((item) => (
          <SidebarNavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} accent={accent} />
        ))}
      </nav>

      <div className="border-t border-border p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button onClick={toggleDark} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-1" aria-label="Toggle theme">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <NotificationBell />
          {!collapsed && (
            <button onClick={signOut} className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-1">
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
