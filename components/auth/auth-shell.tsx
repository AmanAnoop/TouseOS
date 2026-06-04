"use client";

import Link from "next/link";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}

export function AuthShell({ children, title, subtitle, footer }: AuthShellProps) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <div style={{ minHeight: "100vh", display: "grid" }} className="lg:grid-cols-2">
        <div
          className="hidden lg:flex flex-col justify-between"
          style={{
            padding: "40px 56px",
            background: "var(--color-sidebar)",
            color: "var(--color-text-inverse)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "var(--color-org-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                T
              </div>
              <div>
                <p className="type-h1" style={{ color: "var(--color-text-inverse)", margin: 0 }}>TouseOS</p>
                <p className="type-small" style={{ color: "rgba(247,246,243,0.65)", margin: 0 }}>For chapters, teams, and clubs</p>
              </div>
            </div>
            <p className="type-display" style={{ marginTop: 40, maxWidth: 400, color: "var(--color-text-inverse)" }}>
              Run your organization in one place.
            </p>
            <p className="type-body" style={{ marginTop: 12, maxWidth: 360, color: "rgba(247,246,243,0.65)" }}>
              Members, dues, events, and communications — built for Greek life, club sports, and campus organizations.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 24px" }}>
          <div className="ds-card" style={{ maxWidth: 420, margin: "0 auto", width: "100%" }}>
            <h1 className="type-h1" style={{ margin: "0 0 8px" }}>{title}</h1>
            <p className="type-small" style={{ margin: "0 0 24px" }}>{subtitle}</p>
            {children}
            {footer && <div style={{ marginTop: 24 }}>{footer}</div>}
          </div>
          <p className="type-small" style={{ textAlign: "center", marginTop: 32 }}>
            <Link href="/terms" style={{ color: "var(--color-text-secondary)" }}>Terms</Link>
            {" · "}
            <Link href="/privacy" style={{ color: "var(--color-text-secondary)" }}>Privacy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
