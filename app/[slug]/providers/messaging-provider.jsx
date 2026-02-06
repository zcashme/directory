"use client";
import { createContext, useState } from "react";

export const MessagingContext = createContext();

export function MessagingProvider({ children }) {
  const [mode, setMode] = useState("note");
  const [draft, setDraft] = useState({ memo: "", amount: "" });
  const [verify, setVerify] = useState({
    memo: "", amount: "0", zId: null, requestId: null,
  });

  const setDraftMemo = (v) => setDraft((p) => ({ ...p, memo: v ?? "" }));
  const setDraftAmount = (v) => setDraft((p) => ({ ...p, amount: v ?? "" }));
  const setVerifyMemo = (v) => setVerify((p) => ({ ...p, memo: v ?? "" }));
  const setVerifyAmount = (v) => setVerify((p) => ({ ...p, amount: v ?? "0" }));
  const setVerifyId = (zId) => setVerify((p) => ({ ...p, zId }));
  const setVerifyRequestId = (requestId) => setVerify((p) => ({ ...p, requestId }));

  return (
    <MessagingContext.Provider value={{
      mode, setMode,
      draft, verify,
      setDraftMemo, setDraftAmount,
      setVerifyMemo, setVerifyAmount,
      setVerifyId, setVerifyRequestId,
    }}>
      {children}
    </MessagingContext.Provider>
  );
}
