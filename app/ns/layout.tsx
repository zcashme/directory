import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ZNS",
  icons: {
    icon: "/zns-favicon.png",
  },
};

interface NsLayoutProps {
  children: ReactNode;
}

export default function NsLayout({ children }: NsLayoutProps) {
  return (
    <>
      <style>{`
        /* Hide the root ProfileHeader only on /ns routes */
        body > div.sticky.top-3.z-\\[50\\] {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  );
}
