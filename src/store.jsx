"use client";

import { useState, useEffect } from "react";
import { FeedbackContext } from "./feedback-context";


export function FeedbackProvider({ children }) {
  

  // core state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [forceShowQR, setForceShowQR] = useState(false);

  // pending edits are plain state only (no events emitted here)
  const [pendingEdits, _setPendingEdits] = useState({});

  // harmless independent flag for title changes ONLY
  const [editChangesRequested, setEditChangesRequested] = useState(false);

  // feedback UI state
  const [mode, setMode] = useState("note"); // "note" or "signin"
  const [draft, setDraft] = useState({ memo: "", amount: "0" });
  const [verify, setVerify] = useState({ memo: "", amount: "0", zId: null });

  // setters
  const setDraftMemo = (v) => setDraft((p) => ({ ...p, memo: v ?? "" }));
  const setDraftAmount = (v) => setDraft((p) => ({ ...p, amount: v ?? "0" }));
  const setVerifyMemo = (v) => setVerify((p) => ({ ...p, memo: v ?? "" }));
  const setVerifyAmount = (v) => setVerify((p) => ({ ...p, amount: v ?? "0" }));
  const setVerifyId = (zId) => setVerify((p) => ({ ...p, zId }));

  // external helpers for editor components
  const setPendingEdits = (field, value) => {
    _setPendingEdits((prev) => ({ ...prev, [field]: value }));
  };
  const clearPendingEdits = () => _setPendingEdits({});

  useEffect(() => {
    if (!pendingEdits) return;
    console.log("✅ pendingEdits changed:", pendingEdits);
    window.pendingEdits = pendingEdits;
  }, [pendingEdits]);

  return (
    <FeedbackContext.Provider
      value={{
        // directory/selection
        selectedAddress,
        setSelectedAddress,
        forceShowQR,
        setForceShowQR,

        // edits
        pendingEdits,
        setPendingEdits,
        clearPendingEdits,

        // edit-change flag for title (SAFE, independent)
        editChangesRequested,
        setEditChangesRequested,

        // feedback UI
        mode,
        setMode,
        draft,
        verify,
        setDraftMemo,
        setDraftAmount,
        setVerifyMemo,
        setVerifyAmount,
        setVerifyId,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}



