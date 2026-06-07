"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getProductId, productHomePath } from "@/lib/org-product";
import { isPathAllowedByFeatureFlags } from "@/lib/platform-feature-routes";
import { DEFAULT_FEATURE_FLAGS } from "@/lib/platform-feature-flags";

const BYPASS_PREFIXES = ["/platform-admin", "/settings", "/suspended"];

export function PlatformRouteGuard({
  orgType,
  featureFlags,
  children,
}: {
  orgType: string;
  featureFlags: Record<string, boolean>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const product = getProductId(orgType);
  const flags = { ...DEFAULT_FEATURE_FLAGS, ...featureFlags };

  const bypassed = BYPASS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const allowed = bypassed || isPathAllowedByFeatureFlags(pathname, flags);

  useEffect(() => {
    if (!pathname || allowed) return;
    toast.error("This feature is temporarily disabled");
    router.replace(productHomePath(product));
  }, [pathname, allowed, product, router]);

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
