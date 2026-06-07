import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  orgName?: string | null;
  breadcrumb?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Dashboard-only 4px org accent bar */
  showDashboardAccent?: boolean;
}

/**
 * Standard page chrome — header, breadcrumbs, content rhythm (step 11).
 */
export function PageShell({
  title,
  orgName,
  breadcrumb,
  description,
  action,
  children,
  showDashboardAccent,
}: PageShellProps) {
  return (
    <div className="ds-page-shell">
      {showDashboardAccent ? <div className="ds-dashboard-accent-bar" aria-hidden /> : null}
      <header className="ds-page-shell-header">
        <div className="ds-page-shell-header-text">
          {breadcrumb ? <p className="ds-page-shell-breadcrumb">{breadcrumb}</p> : null}
          {orgName ? <p className="ds-page-header-org">{orgName}</p> : null}
          <h1 className="type-h1 ds-page-shell-title">{title}</h1>
          {description ? <p className="ds-page-shell-description">{description}</p> : null}
        </div>
        {action ? <div className="ds-page-shell-header-action">{action}</div> : null}
      </header>
      <div className="ds-page-stack">{children}</div>
    </div>
  );
}
