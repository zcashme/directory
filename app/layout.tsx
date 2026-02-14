import type { ReactNode } from "react";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import { getProfileCount } from "@/lib/profile/profileQueries";
import "./globals.css";

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const profileCount = await getProfileCount();

  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <ProfileHeader profileCount={profileCount} />
        {children}
      </body>
    </html>
  );
}
