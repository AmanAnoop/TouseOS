"use client";

import Link from "next/link";
import { OnboardingRegalTheme } from "@/components/onboarding/onboarding-regal-theme";

interface AuthShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}

export function AuthShell({ children, title, subtitle, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen theme-regal bg-background">
      <OnboardingRegalTheme />
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r border-border bg-card/80">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-xl shadow-card-md">
                Τ
              </div>
              <div>
                <p className="font-serif text-2xl font-semibold tracking-tight text-foreground">TouseOS</p>
                <p className="text-xs text-muted-foreground">Chapter command center</p>
              </div>
            </div>
            <p className="mt-10 font-serif text-3xl xl:text-4xl font-semibold text-foreground leading-tight max-w-md">
              Refined operations for Greek life, club sports, and campus orgs.
            </p>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
              British racing green and navy foundation — your fraternity, sorority, and university colors
              applied where they belong.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 h-2 rounded-full bg-primary" title="Organization colors" />
            <div className="flex-1 h-2 rounded-full bg-campus-600" title="Campus colors" />
            <div className="flex-1 h-2 rounded-full bg-regal-gold/80" title="Regal accent" />
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold">
              Τ
            </div>
            <span className="font-serif text-xl font-semibold">TouseOS</span>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="mb-6 lg:mb-8">
              <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
            </div>

            <div className="regal-card p-6 sm:p-8 border-t-4 border-t-campus-600 shadow-card-md">
              {children}
            </div>

            {footer && <div className="mt-6">{footer}</div>}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 max-w-md mx-auto">
            <Link href="/terms" className="hover:text-foreground underline-offset-2 hover:underline">Terms</Link>
            {" · "}
            <Link href="/privacy" className="hover:text-foreground underline-offset-2 hover:underline">Privacy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
