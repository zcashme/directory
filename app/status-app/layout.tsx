import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Zcash.me Status",
    template: "%s | Zcash.me Status",
  },
  description: "Live service status and incident history for Zcash.me.",
};

export default function StatusLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
