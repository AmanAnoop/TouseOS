import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { THEME_INIT_SCRIPT } from "@/lib/touse-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TouseOS", template: "%s | TouseOS" },
  description:
    "The campus organization operating system for fraternities, sororities, and club sports.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#F7F6F3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <head>
        <Script id="touse-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              width: "320px",
              background: "var(--color-bg-raised)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-md)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
