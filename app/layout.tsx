"use client";

import type { ReactNode } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { Providers } from "./providers";
import "./globals.css";

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <Providers>
          <ProfileHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
