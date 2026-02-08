import type { ReactNode } from "react";
import NsProviders from "./ns-providers.jsx";

interface NsLayoutProps {
  children: ReactNode;
}

export default function NsLayout({ children }: NsLayoutProps) {
  return <NsProviders>{children}</NsProviders>;
}
