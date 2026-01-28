import { useEffect, useMemo, useCallback } from "react";
import { useFeedback } from "./useFeedback";
import { buildZcashUri } from "../utils/zcashWalletUtils";
import { buildZcashEditMemo } from "../utils/zcashMemoUtils";

export default function useFeedbackController() {
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
    return buildZcashUri(selectedAddress, finalAmount, memo);
  }, [selectedAddress, draft]);

  const verifyUri = useMemo(() => {
    const { memo, amount } = verify;
    return buildZcashUri(selectedAddress, amount, memo);
  }, [selectedAddress, verify]);

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
    selectedAddress,
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
