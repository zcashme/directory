"use client";
import { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import type { MessagingContextType } from "@/types/contexts";

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

  const setDraftMemo = (v: string | null) => setDraft((p) => ({ ...p, memo: v ?? "" }));
  const setDraftAmount = (v: string | null) => setDraft((p) => ({ ...p, amount: v ?? "" }));
  const setVerifyMemo = (v: string | null) => setVerify((p) => ({ ...p, memo: v ?? "" }));
  const setVerifyAmount = (v: string | null) => setVerify((p) => ({ ...p, amount: v ?? "0" }));
  const setVerifyId = (zId: number | null) => setVerify((p) => ({ ...p, zId }));
  const setVerifyRequestId = (requestId: string | null) => setVerify((p) => ({ ...p, requestId }));

  const value: MessagingContextType = {
    mode,
    setMode,
    draft,
    verify,
    setDraftMemo,
    setDraftAmount,
    setVerifyMemo,
    setVerifyAmount,
    setVerifyId,
    setVerifyRequestId,
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
