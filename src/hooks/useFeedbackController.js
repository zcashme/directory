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

    if (nextMemo !== verify.memo) setVerifyMemo(nextMemo);
  }, [mode, verify.zId, verify.requestId, pendingEdits, verify.memo, setVerifyMemo]);

  // Helper: determine if a draft amount should be included in the URI
  const normalizedDraftAmount = useMemo(() => {
    const raw = String(draft?.amount ?? "").trim();
    if (raw === "") return ""; // allow empty while typing

    // allow "0." while typing (treat as not-ready)
    if (raw === "0." || raw === ".") return "";

    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return "";
    return raw;
  }, [draft?.amount]);

  const uri = useMemo(() => {
    const memo = draft?.memo ?? "";

    // IMPORTANT:
    // If amount is empty/invalid, build URI WITHOUT amount (or with empty string)
    // so the UI doesn't fight the user.
    return buildZcashUri(selectedAddress, normalizedDraftAmount, memo);
  }, [selectedAddress, normalizedDraftAmount, draft?.memo]);

  const verifyUri = useMemo(() => {
    const memo = verify?.memo ?? "";
    const amount = String(verify?.amount ?? "").trim();
    return buildZcashUri(selectedAddress, amount, memo);
  }, [selectedAddress, verify]);

  const copyUri = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uri);
    } catch {
      // ignore
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

    // IMPORTANT: do NOT coerce draft amount to "0.000" or "0"
    memo: draft?.memo ?? "",
    amount: String(draft?.amount ?? ""), // <-- allow "" so user can delete

    verifyMemo: verify?.memo ?? "",
    verifyAmount: String(verify?.amount ?? ""),

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
