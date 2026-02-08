import type { Metadata } from "next";
import type { ReactNode } from "react";
import NsProviders from "./ns-providers.jsx";

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
  return <NsProviders>{children}</NsProviders>;
}
