"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  getProductId,
  isRouteAllowed,
  productHomePath,
  productLabel,
} from "@/lib/org-product";

export function ProductRouteGuard({
  orgType,
  hasGreekMembership = false,
  children,
}: {
  orgType: string;
  hasGreekMembership?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const product = getProductId(orgType);
  useEffect(() => {
    if (!orgType || !pathname) return;
    if (isRouteAllowed(orgType, pathname, { hasGreekMembership })) return;

    toast.error(`${productLabel(product)} organizations cannot access this page`);
    router.replace(productHomePath(product));
  }, [orgType, pathname, product, router, hasGreekMembership]);

  if (!isRouteAllowed(orgType, pathname, { hasGreekMembership })) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Redirecting to your workspace…
      </div>
    );
  }

  return <>{children}</>;
}
