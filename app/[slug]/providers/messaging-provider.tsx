"use client";
import { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import type { MessagingContextType } from "./types";

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<string>("note");
  const [draft, setDraft] = useState<{ memo: string; amount: string }>({ memo: "", amount: "" });
  const [verify, setVerify] = useState<{
    memo: string;
    amount: string;
    zId: number | null;
    requestId: string | null;
  }>({
    memo: "", amount: "0", zId: null, requestId: null,
  });

  const value: MessagingContextType = {
    mode,
    setMode,
    draft,
    setDraft,
    verify,
    setVerify,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging(): MessagingContextType {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used within MessagingProvider");
  }
  return context;
}
