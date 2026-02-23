import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Zcash.me Blog",
    template: "%s | Zcash.me Blog",
  },
  description: "Updates, guides, and news from the Zcash.me team.",
};

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
