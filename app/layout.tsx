import type { ReactNode } from "react";
import Link from "next/link";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import FloatingSidebarMenu from "@/ui/common/layout/FloatingSidebarMenu";
import { getProfileCount } from "@/lib/profile/profileQueries";
import "./globals.css";

interface RootLayoutProps {
  children: ReactNode;
}

const SOCIAL_LINKS = [
  { href: "https://x.com/zcashme", label: "X (Twitter)", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z", evenodd: false },
  { href: "https://discord.gg/z2H23QgAGf", label: "Discord", path: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.29-.444.67-.608 1.06a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.06.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z", evenodd: false },
  { href: "https://github.com/zcashme", label: "GitHub", path: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.464-1.178-1.132-1.49-1.132-1.49-.927-.634.07-.622.07-.622 1.025.072 1.564 1.032 1.564 1.032.91 1.56 2.384 1.088 2.96.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z", evenodd: true },
] as const;

export default async function RootLayout({ children }: RootLayoutProps) {
  const profileCount = await getProfileCount();

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
        <ProfileHeader profileCount={profileCount} />
        <FloatingSidebarMenu />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-gray-200" style={{ backgroundColor: "var(--color-background)" }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex justify-center items-center gap-6 pt-3 pb-1">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 hover:scale-110 transition-all"
                  aria-label={link.label}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path {...(link.evenodd && { fillRule: "evenodd", clipRule: "evenodd" })} d={link.path} />
                  </svg>
                </a>
              ))}
            </div>
            <div className="w-full flex items-center justify-between gap-3 text-xs text-gray-500 pb-3" style={{ minHeight: 34 }}>
              <span>&copy; 2026 ZcashMe, Inc.</span>
              <div className="ml-auto flex items-center justify-end gap-4">
                <Link href="/terms" className="hover:text-gray-600 transition-colors leading-relaxed">Terms</Link>
                <Link href="/privacy" className="hover:text-gray-600 transition-colors leading-relaxed">Privacy</Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
