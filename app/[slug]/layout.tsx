import type { ReactNode } from "react";
import Providers from "./providers";

interface ProfileLayoutProps {
  children: ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return <Providers>{children}</Providers>;
}
