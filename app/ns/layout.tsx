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
  return children;
}
