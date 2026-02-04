import { useContext, useEffect, useMemo, useCallback } from "react";
import { SelectionContext } from "@/ui/profile/selection-provider";
import { EditsContext } from "@/ui/profile/edits-provider";
import { MessagingContext } from "@/ui/messaging/messaging-provider";
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
    selectedAddress,
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

  // If no explicit address passed, fall back to context (for NS directory compat)
  const effectiveAddress = address ?? selectedAddress;

  useEffect(() => {
    if (mode !== "signin") return;

    const zId = verify.zId || null;
    if (!zId) return;
    const requestId = verify.requestId || null;

    const hasEdits = pendingEdits && Object.keys(pendingEdits).length > 0;

    const profileDiff = {
      ...(pendingEdits?.profile || {}),
      l: pendingEdits?.l || [],
    };

    const nextMemo = hasEdits
      ? buildZcashEditMemo(profileDiff, zId, requestId)
      : buildZcashEditMemo({}, zId, requestId);

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
    const finalAmount = amount && amount !== "0" ? amount : "0";
    return buildZcashUri(effectiveAddress, finalAmount, memo);
  }, [effectiveAddress, draft]);

  const verifyUri = useMemo(() => {
    const { memo, amount } = verify;
    return buildZcashUri(effectiveAddress, amount, memo);
  }, [effectiveAddress, verify]);

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
    amount: draft.amount && draft.amount !== "0" ? draft.amount : "0.000",
    verifyMemo: verify.memo || "",
    verifyAmount: verify.amount || "0",
    selectedAddress: effectiveAddress,
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
