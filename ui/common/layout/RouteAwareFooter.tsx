"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function RouteAwareFooter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/brief" || pathname === "/invest" ? null : children;
}
