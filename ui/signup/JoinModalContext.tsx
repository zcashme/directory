"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface JoinModalState {
  isJoinOpen: boolean;
  prefillUsername: string | null;
  prefillReferrer: string | null;
  prefillReferrerId: number | null;
  justCreatedSlug: string | null;
  openJoin: (opts?: { prefillUsername?: string | null; prefillReferrer?: string | null; prefillReferrerId?: number | null }) => void;
  closeJoin: () => void;
  notifyCreated: (slug: string) => void;
  clearJustCreated: () => void;
}

const JoinModalContext = createContext<JoinModalState | null>(null);

export function JoinModalProvider({ children }: { children: ReactNode }) {
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [prefillUsername, setPrefillUsername] = useState<string | null>(null);
  const [prefillReferrer, setPrefillReferrer] = useState<string | null>(null);
  const [prefillReferrerId, setPrefillReferrerId] = useState<number | null>(null);
  const [justCreatedSlug, setJustCreatedSlug] = useState<string | null>(null);

  const openJoin = (opts?: { prefillUsername?: string | null; prefillReferrer?: string | null; prefillReferrerId?: number | null }) => {
    setPrefillUsername(opts?.prefillUsername ?? null);
    setPrefillReferrer(opts?.prefillReferrer ?? null);
    setPrefillReferrerId(opts?.prefillReferrerId ?? null);
    setIsJoinOpen(true);
  };

  const closeJoin = () => {
    setIsJoinOpen(false);
    setPrefillUsername(null);
    setPrefillReferrer(null);
    setPrefillReferrerId(null);
  };

  const notifyCreated = (slug: string) => {
    setJustCreatedSlug(slug);
    closeJoin();
  };

  const clearJustCreated = () => setJustCreatedSlug(null);

  return (
    <JoinModalContext.Provider value={{ isJoinOpen, prefillUsername, prefillReferrer, prefillReferrerId, justCreatedSlug, openJoin, closeJoin, notifyCreated, clearJustCreated }}>
      {children}
    </JoinModalContext.Provider>
  );
}

export function useJoinModal() {
  const ctx = useContext(JoinModalContext);
  if (!ctx) throw new Error("useJoinModal must be used within a JoinModalProvider");
  return ctx;
}
