import type { ReactNode } from "react";

/**
 * Minimal layout for the auth pages.
 *
 * No ZcashMe navigation, no sidebar, no profile header.
 * Just a centered card on a clean background — like Google's
 * login page (Google-branded, but no Google main nav).
 */

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-4 py-8">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}