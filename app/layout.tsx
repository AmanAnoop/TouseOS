import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "TouseOS", template: "%s | TouseOS" },
  description:
    "The campus organization operating system for fraternities, sororities, and club sports.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#004225",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${serif.variable} theme-regal`}>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "!bg-card !text-foreground !border !border-border !shadow-card-md !text-sm",
          }}
        />
      </body>
    </html>
  );
}
