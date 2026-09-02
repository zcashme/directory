"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function RouteAwareFooter({ children }: { children: ReactNode }) {
  return usePathname() === "/invest" ? null : children;
}
