import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildNsMetadata } from "./nsLandingContent";

export const metadata: Metadata = buildNsMetadata("directory");

interface NsLayoutProps {
  children: ReactNode;
}

export default function NsLayout({ children }: NsLayoutProps) {
  return children;
}
