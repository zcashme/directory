"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface JoinModalState {
  isJoinOpen: boolean;
  prefillUsername: string | null;
  justCreatedSlug: string | null;
  openJoin: (opts?: { prefillUsername?: string | null }) => void;
  closeJoin: () => void;
  notifyCreated: (slug: string) => void;
  clearJustCreated: () => void;
}

const JoinModalContext = createContext<JoinModalState | null>(null);

export function JoinModalProvider({ children }: { children: ReactNode }) {
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [prefillUsername, setPrefillUsername] = useState<string | null>(null);
  const [justCreatedSlug, setJustCreatedSlug] = useState<string | null>(null);

  const openJoin = (opts?: { prefillUsername?: string | null }) => {
    setPrefillUsername(opts?.prefillUsername ?? null);
    setIsJoinOpen(true);
  };

  const closeJoin = () => {
    setIsJoinOpen(false);
    setPrefillUsername(null);
  };

  const notifyCreated = (slug: string) => {
    setJustCreatedSlug(slug);
    closeJoin();
  };

  const clearJustCreated = () => setJustCreatedSlug(null);

  return (
    <JoinModalContext.Provider value={{ isJoinOpen, prefillUsername, justCreatedSlug, openJoin, closeJoin, notifyCreated, clearJustCreated }}>
      {children}
    </JoinModalContext.Provider>
  );
}

export function useJoinModal() {
  const ctx = useContext(JoinModalContext);
  if (!ctx) throw new Error("useJoinModal must be used within a JoinModalProvider");
  return ctx;
}
