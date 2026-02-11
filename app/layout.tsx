import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import LegacyServiceWorkerCleanup from "./components/LegacyServiceWorkerCleanup";

export const metadata: Metadata = {
  title: "Zcash.me",
  description: "Zcash.me directory and profiles.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        {/* TEMPORARY: Remove after 1-2 releases */}
        <LegacyServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
