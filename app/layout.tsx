import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "./providers/query-provider";
import "./globals.css";

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
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
