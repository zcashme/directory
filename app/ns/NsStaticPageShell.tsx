"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import AddUserForm from "@/ui/signup/AddUserForm";
import NsHeader from "./NsHeader";
import { NsPageFrame } from "./NsLandingComponents";

interface NsStaticPageShellProps {
  children: ReactNode;
}

export default function NsStaticPageShell({ children }: NsStaticPageShellProps) {
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <NsPageFrame>
      <NsHeader
        onJoinClick={() => setIsJoinOpen(true)}
      />
      <div className="pt-20 sm:pt-24">{children}</div>
      <AddUserForm
        isOpen={isJoinOpen}
        isNsSignup
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={() => {
          setIsJoinOpen(false);
        }}
      />
    </NsPageFrame>
  );
}
