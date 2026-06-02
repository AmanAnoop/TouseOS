"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import type { Organization, Profile } from "@/types";

interface AppShellProps {
  org: Organization | null;
  orgs: Organization[];
  profile: Profile | null;
  children: React.ReactNode;
}

export function AppShell({ org, orgs, profile, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-parchment">
      <ServiceWorkerRegister />
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          org={org}
          orgs={orgs}
          profile={profile}
          orgType={org?.type ?? "general_org"}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 flex">
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

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div
          className={cn(
            "flex-1 px-4 py-4 sm:px-6 sm:py-6",
            "pb-24 lg:pb-6", // extra bottom padding for mobile nav
          )}
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav
        orgType={org?.type ?? "general_org"}
        onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  );
}
