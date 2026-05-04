import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildNsMetadata } from "./nsLandingContent";
import NsThemeEffect from "./NsThemeEffect";

export const metadata: Metadata = buildNsMetadata("directory");

interface NsLayoutProps {
  children: ReactNode;
}

export default function NsLayout({ children }: NsLayoutProps) {
  return (
    <>
      <NsThemeEffect />
      {children}
    </>
  );
}
