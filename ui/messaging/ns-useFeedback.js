import { useContext, useEffect, useMemo, useCallback } from "react";
import { NsSelectionContext } from "@/app/ns/ns-selection-provider";
import { EditsContext } from "@/app/[slug]/providers/edits-provider";
import { MessagingContext } from "@/app/[slug]/providers/messaging-provider";
import { buildZcashUri, buildZcashEditMemo } from "@/lib/zcash/zcashUtils";

export function nsUseFeedback() {
  return {
    ...useContext(NsSelectionContext),
    ...useContext(EditsContext),
    ...useContext(MessagingContext),
  };
}

export default nsUseFeedback;

export function nsUseFeedbackController(address) {
  const {
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
    setMode,
    mode,
  } = nsUseFeedback();

  const effectiveAddress = address ?? selectedAddress;

  useEffect(() => {
    if (mode !== "signin") return;

    const zId = verify.zId || null;
    if (!zId) return;
    const requestId = verify.requestId || null;

    const hasEdits = pendingEdits && (
      (pendingEdits.profile && Object.keys(pendingEdits.profile).length > 0) ||
      (Array.isArray(pendingEdits.l) && pendingEdits.l.length > 0)
    );

    const profileDiff = {
      ...(pendingEdits?.profile || {}),
      l: pendingEdits?.l || [],
    };

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
    setMode,
  };
}
