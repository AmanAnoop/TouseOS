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
        <div className="hidden lg:flex flex-col justify-between border-r border-border bg-card/80 p-10 xl:p-14">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-semibold text-primary-foreground shadow-sm">
                Τ
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-foreground">TouseOS</p>
                <p className="text-xs text-muted-foreground">For chapters, teams, and clubs</p>
              </div>
            </div>
            <p className="mt-10 max-w-md text-2xl font-semibold leading-tight text-foreground xl:text-3xl">
              Run your organization in one place.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Members, dues, events, and communications — built for Greek life, club sports, and campus
              organizations.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">
              Τ
            </div>
            <span className="text-xl font-semibold">TouseOS</span>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 lg:mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="regal-card border border-border p-6 shadow-sm sm:p-8">{children}</div>

            {footer && <div className="mt-6">{footer}</div>}
          </div>

          <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground hover:underline underline-offset-2">
              Terms
            </Link>
            {" · "}
            <Link href="/privacy" className="hover:text-foreground hover:underline underline-offset-2">
              Privacy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
