import type { ReactNode } from "react";
import { Providers } from "../providers";

interface SwapLayoutProps {
  children: ReactNode;
}

export default function SwapLayout({ children }: SwapLayoutProps) {
  return <Providers>{children}</Providers>;
}
