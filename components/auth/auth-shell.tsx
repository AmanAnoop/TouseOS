"use client";

import Link from "next/link";
import { Calendar, Landmark, Users } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}

const FEATURES = [
  { icon: Users, title: "Roster & communications", desc: "One hub for members, announcements, and chapter feed." },
  { icon: Landmark, title: "Dues & chapter finances", desc: "Collect dues with Stripe and sync your checking account." },
  { icon: Calendar, title: "Events & operations", desc: "Calendar, tasks, documents, and officer handoffs." },
];

export function AuthShell({ children, title, subtitle, footer }: AuthShellProps) {
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
            <p className="auth-panel-eyebrow">Campus organizations, simplified</p>
            <h1 className="auth-panel-headline">
              Run your chapter
              <br />
              in one place.
            </h1>
            <p className="auth-panel-lead">
              Members, dues, events, and finances — built for Greek life, club sports, and campus orgs.
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
            Trusted by treasurers and officers who need clarity, not spreadsheets.
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
              <h2 className="auth-form-title">{title}</h2>
              <p className="auth-form-subtitle">{subtitle}</p>
            </header>
            <div className="auth-form-body">{children}</div>
            {footer ? <footer className="auth-form-footer">{footer}</footer> : null}
          </div>

          <p className="auth-legal">
            <Link href="/terms">Terms</Link>
            <span aria-hidden> · </span>
            <Link href="/privacy">Privacy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
