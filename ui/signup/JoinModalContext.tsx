"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface JoinModalState {
  isJoinOpen: boolean;
  prefillUsername: string | null;
  prefillReferrer: string | null;
  justCreatedSlug: string | null;
  openJoin: (opts?: { prefillUsername?: string | null; prefillReferrer?: string | null }) => void;
  closeJoin: () => void;
  notifyCreated: (slug: string) => void;
}

const JoinModalContext = createContext<JoinModalState | null>(null);

export function JoinModalProvider({ children }: { children: ReactNode }) {
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [prefillUsername, setPrefillUsername] = useState<string | null>(null);
  const [prefillReferrer, setPrefillReferrer] = useState<string | null>(null);
  const [justCreatedSlug, setJustCreatedSlug] = useState<string | null>(null);

  const openJoin = (opts?: { prefillUsername?: string | null; prefillReferrer?: string | null }) => {
    setPrefillUsername(opts?.prefillUsername ?? null);
    setPrefillReferrer(opts?.prefillReferrer ?? null);
    setIsJoinOpen(true);
  };

  const closeJoin = () => {
    setIsJoinOpen(false);
    setPrefillUsername(null);
    setPrefillReferrer(null);
  };

  const notifyCreated = (slug: string) => {
    setJustCreatedSlug(slug);
    closeJoin();
  };

  return (
    <JoinModalContext.Provider value={{ isJoinOpen, prefillUsername, prefillReferrer, justCreatedSlug, openJoin, closeJoin, notifyCreated }}>
      {children}
    </JoinModalContext.Provider>
  );
}

export function useJoinModal() {
  const ctx = useContext(JoinModalContext);
  if (!ctx) throw new Error("useJoinModal must be used within a JoinModalProvider");
  return ctx;
}
