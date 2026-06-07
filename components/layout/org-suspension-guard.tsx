"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function OrgSuspensionGuard({
  suspended,
  children,
}: {
  suspended: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onSuspendedPage = pathname === "/suspended";

  useEffect(() => {
    if (suspended && !onSuspendedPage) {
      router.replace("/suspended");
      return;
    }
    if (!suspended && onSuspendedPage) {
      router.replace("/dashboard");
    }
  }, [suspended, onSuspendedPage, router]);

  if (suspended && !onSuspendedPage) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
