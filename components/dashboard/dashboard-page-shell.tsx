import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/page-shell";
import type { ProductAccent } from "@/lib/org-product";
import { userFacingProductName } from "@/lib/user-facing-product";
import { dashboardViewLabel } from "@/lib/dashboard-header";

interface DashboardPageShellProps {
  product: ProductAccent;
  title: string;
  orgName: string;
  isOfficer: boolean;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Shared dashboard chrome for Greek (/dashboard), sports (/sports), and ClubOS (/club).
 */
export function DashboardPageShell({
  product,
  title,
  orgName,
  isOfficer,
  description,
  action,
  children,
}: DashboardPageShellProps) {
  const breadcrumb = `${userFacingProductName()} · ${dashboardViewLabel(product, isOfficer)}`;

  return (
    <PageShell
      title={title}
      orgName={orgName}
      breadcrumb={breadcrumb}
      description={description}
      action={action}
      showDashboardAccent
      product={product}
      variant="dashboard"
    >
      {children}
    </PageShell>
  );
}
