import { useContext, useEffect, useMemo, useCallback } from "react";
import { SelectionContext } from "@/app/[slug]/providers/selection-provider";
import { EditsContext } from "@/app/[slug]/providers/edits-provider";
import { MessagingContext } from "@/app/[slug]/providers/messaging-provider";
import { buildZcashUri, buildZcashEditMemo } from "@/lib/zcash/zcashUtils";

export function useFeedback() {
  return {
    ...useContext(SelectionContext),
    ...useContext(EditsContext),
    ...useContext(MessagingContext),
  };
}

export default useFeedback;

let listenerBound = false;

export function useFeedbackEvents() {
const {
  setMode,
  setPendingEdits,
  setVerifyId,
  setVerifyMemo,
  setVerifyAmount,
  setVerifyRequestId,
  setForceShowQR,
} = useFeedback();


  useEffect(() => {
    if (listenerBound) return;
    listenerBound = true;

    const handleSignIn = (e) => {
      const { zId } = e.detail || {};

      if (zId) {
        setVerifyId(zId);
        setVerifyMemo(`{z:${zId}}`);
      }

      setVerifyRequestId(null);
      setVerifyAmount("0");
      setMode("signin");
    };

    const handleDraft = () => setMode("note");

    const handlePendingEdits = (e) => {
      if (!e.detail) return;
      try {
        setPendingEdits(e.detail);
      } catch (err) {
      }
    };

    window.addEventListener("enterSignInMode", handleSignIn);
    window.addEventListener("enterDraftMode", handleDraft);
    window.addEventListener("pendingEditsUpdated", handlePendingEdits);


  }, [
    setMode,
    setPendingEdits,
    setVerifyId,
    setVerifyMemo,
    setVerifyAmount,
    setVerifyRequestId,
    setForceShowQR,
  ]);
}

export function useFeedbackController(address) {
  const {
    mode,
    draft,
    verify = {},
    pendingEdits,
    setDraftMemo,
    setDraftAmount,
    setVerifyMemo,
    setVerifyAmount,
    setVerifyId,
    setVerifyRequestId,
  } = useFeedback();

  useEffect(() => {
    if (mode !== "signin") return;

    const zId = verify.zId || null;
    if (!zId) return;
    const requestId = verify.requestId || null;

    // Check if there are any pending edits
    const hasEdits = pendingEdits && (
      (pendingEdits.profile && Object.keys(pendingEdits.profile).length > 0) ||
      (Array.isArray(pendingEdits.l) && pendingEdits.l.length > 0)
    );

    const profileDiff = {
      ...(pendingEdits?.profile || {}),
      l: pendingEdits?.l || [],
    };

    // Always build memo with current edits and requestId
    // This ensures the memo is updated whenever edits or requestId changes
    const nextMemo = buildZcashEditMemo(hasEdits ? profileDiff : {}, zId, requestId);

    if (nextMemo !== verify.memo) {
      setVerifyMemo(nextMemo);
    }
  }, [
    mode,
    verify.zId,
    verify.requestId,
    pendingEdits,
    verify.memo,
    setVerifyMemo,
  ]);

  const uri = useMemo(() => {
    const { memo, amount } = draft;
    const finalAmount = amount || "0";
    return buildZcashUri(address, finalAmount, memo);
  }, [address, draft]);

  const verifyUri = useMemo(() => {
    const { memo, amount } = verify;
    return buildZcashUri(address, amount, memo);
  }, [address, verify]);

  const copyUri = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uri);
    } catch {
      void 0;
    }
  }, [uri]);

  const openWallet = useCallback(() => {
    if (!uri) return;
    window.open(uri, "_blank");
  }, [uri]);

  return {
    mode,
    uri,
    verifyUri,
    memo: draft.memo,
    amount: draft.amount || "",
    verifyMemo: verify.memo || "",
    verifyAmount: verify.amount || "0",
    selectedAddress: address,
    copyUri,
    openWallet,
    setVerifyId,
    setVerifyRequestId,
    setDraftMemo,
    setDraftAmount,
    setVerifyMemo,
    setVerifyAmount,
  };
}
