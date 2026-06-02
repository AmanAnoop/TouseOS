import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { cormorant } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TouseOS", template: "%s | TouseOS" },
  description:
    "The campus organization operating system for fraternities, sororities, and club sports.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0F2318",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cormorant.variable} suppressHydrationWarning>
      <body className="bg-parchment text-navy antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              "!bg-white !text-navy !border !border-[#E8E4DC] !shadow-card-md !text-sm !font-sans",
          }}
        />
      </body>
    </html>
  );
}
