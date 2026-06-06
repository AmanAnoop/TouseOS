"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { ProductRouteGuard } from "@/components/layout/product-route-guard";
import { OrgThemeProvider } from "@/components/theme/org-theme-provider";
import { ActiveOrgProvider, type ActiveOrgSnapshot } from "@/components/providers/active-org-provider";
import { userHasGreekOrg } from "@/lib/org-product";
import type { Organization, Profile } from "@/types";

interface AppShellProps {
  org: Organization | null;
  orgs: Organization[];
  profile: Profile | null;
  activeOrg?: ActiveOrgSnapshot | null;
  impersonating?: boolean;
  impersonateOrgName?: string;
  children: React.ReactNode;
}

export function AppShell({
  org,
  orgs,
  profile,
  activeOrg,
  impersonating,
  impersonateOrgName,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasGreekMembership = userHasGreekOrg(orgs);

  return (
    <div className="ds-app">
      <OrgThemeProvider org={org} />
      <ServiceWorkerRegister />

      <div className="hidden lg:flex flex-shrink-0 fixed left-0 top-0 bottom-0 z-30">
        <Sidebar
          org={org}
          orgs={orgs}
          profile={profile}
          orgType={org?.type ?? "general_org"}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0"
            style={{ background: "var(--modal-backdrop)" }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 h-full">
            <Sidebar
              org={org}
              orgs={orgs}
              profile={profile}
              orgType={org?.type ?? "general_org"}
              onClose={() => setSidebarOpen(false)}
              mobile
            />
          </div>
        </div>
      )}

      <div className="ds-main">
        <div className="ds-main-inner">
          {impersonating && impersonateOrgName && (
            <ImpersonationBanner orgName={impersonateOrgName} />
          )}
          <ProductRouteGuard
            orgType={org?.type ?? "general_org"}
            hasGreekMembership={hasGreekMembership}
          >
            <ActiveOrgProvider initial={activeOrg ?? null}>
              {children}
            </ActiveOrgProvider>
          </ProductRouteGuard>
        </div>
      </div>

      <BottomNav orgType={org?.type ?? "general_org"} />
    </div>
  );
}
