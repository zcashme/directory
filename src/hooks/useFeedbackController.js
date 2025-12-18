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
  } = useFeedback();

  useEffect(() => {
    if (mode !== "signin") return;

    const zId = verify.zId || null;
    if (!zId) return;

    const hasEdits = pendingEdits && Object.keys(pendingEdits).length > 0;

    const profileDiff = {
      ...(pendingEdits?.profile || {}),
      l: pendingEdits?.l || [],
    };

    const nextMemo = hasEdits
      ? buildZcashEditMemo(profileDiff, zId)
      : buildZcashEditMemo({}, zId);

    if (nextMemo !== verify.memo) {
      setVerifyMemo(nextMemo);
    }
  }, [mode, verify.zId, pendingEdits, verify.memo, setVerifyMemo]);

  const uri = useMemo(() => {
    const { memo, amount } = draft;
    const finalAmount = amount && amount !== "0" ? amount : "0.0005";
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
    setDraftMemo,
    setDraftAmount,
    setVerifyMemo,
    setVerifyAmount,
  };
}
