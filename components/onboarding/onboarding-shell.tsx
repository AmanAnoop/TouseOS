"use client";

import Link from "next/link";
import { Calendar, Landmark, Users } from "lucide-react";

interface OnboardingShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}

const FEATURES = [
  { icon: Users, title: "Roster & communications", desc: "One hub for members, announcements, and your org feed." },
  { icon: Landmark, title: "Dues & finances", desc: "Collect dues with Stripe and track chapter budgets." },
  { icon: Calendar, title: "Events & operations", desc: "Calendar, tasks, documents, and officer handoffs." },
];

/** Onboarding entrance chrome — matches auth layout and design system tokens. */
export function OnboardingShell({ children, title, subtitle, footer }: OnboardingShellProps) {
  return (
    <div className="auth-layout">
      <aside className="auth-panel" aria-hidden={false}>
        <div className="auth-panel-inner">
          <Link href="/login" className="auth-brand">
            <span className="auth-brand-mark" aria-hidden>T</span>
            <span className="auth-brand-text">
              <span className="auth-brand-name">TouseOS</span>
              <span className="auth-brand-tagline">For chapters, teams, and clubs</span>
            </span>
          </Link>

          <div className="auth-panel-hero">
            <p className="auth-panel-eyebrow">Get started</p>
            <h1 className="auth-panel-headline">
              Set up your
              <br />
              workspace.
            </h1>
            <p className="auth-panel-lead">
              Create a new organization or join with an invite code from your officers.
            </p>
          </div>

          <ul className="auth-feature-list">
            {FEATURES.map((f) => (
              <li key={f.title} className="auth-feature-item">
                <span className="auth-feature-icon" aria-hidden>
                  <f.icon size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="auth-feature-title">{f.title}</span>
                  <span className="auth-feature-desc">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="auth-panel-foot">
            Your chapter colors and campus settings apply across the app once you create your org.
          </p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Link href="/login" className="auth-brand auth-brand--compact">
            <span className="auth-brand-mark auth-brand-mark--sm" aria-hidden>T</span>
            <span className="auth-brand-name">TouseOS</span>
          </Link>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-form-card">
            <header className="auth-form-header">
              <h2 className="auth-form-title type-h1" style={{ margin: 0, fontSize: "24px" }}>{title}</h2>
              <p className="auth-form-subtitle">{subtitle}</p>
            </header>
            <div className="auth-form-body">{children}</div>
            {footer ? <footer className="auth-form-footer">{footer}</footer> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
