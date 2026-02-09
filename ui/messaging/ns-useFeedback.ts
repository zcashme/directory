import { useEffect, useMemo, useCallback } from "react";
import { useSelectionStore, useEditsStore } from "@/lib/stores/ui-state";
import { useMessagingStore } from "@/lib/stores/messaging";
import type { PendingEdits } from "@/lib/profile/types";
import { buildZcashUri, buildZcashEditMemo } from "@/lib/zcash/zcashUtils";

type NsFeedbackContext = {
  selectedAddress: string | null;
  setSelectedAddress: (address: string | null) => void;
  forceShowQR: boolean;
  setForceShowQR: (value: boolean | ((prev: boolean) => boolean)) => void;
  pendingEdits: PendingEdits;
  setPendingEdits: (edits: PendingEdits | ((prev: PendingEdits) => PendingEdits)) => void;
  editChangesRequested: boolean;
  setEditChangesRequested: (requested: boolean | ((prev: boolean) => boolean)) => void;
  mode: string;
  setMode: (mode: string | ((prev: string) => string)) => void;
  draft: {
    memo: string;
    amount: string;
  };
  setDraft: (draft: { memo: string; amount: string } | ((prev: { memo: string; amount: string }) => { memo: string; amount: string })) => void;
  verify: {
    memo: string;
    amount: string;
    zId: number | null;
    requestId: string | null;
  };
  setVerify: (verify: { memo: string; amount: string; zId: number | null; requestId: string | null } | ((prev: { memo: string; amount: string; zId: number | null; requestId: string | null }) => { memo: string; amount: string; zId: number | null; requestId: string | null })) => void;
};

export function useNsFeedback(): NsFeedbackContext {
  const { selectedAddress, setSelectedAddress, forceShowQR, setForceShowQR } = useSelectionStore();
  const { pendingEdits, setPendingEdits, editChangesRequested, setEditChangesRequested } = useEditsStore();
  const { mode, setMode, draft, setDraft, verify, setVerify } = useMessagingStore();

  return {
    selectedAddress,
    setSelectedAddress,
    forceShowQR,
    setForceShowQR,
    pendingEdits,
    setPendingEdits,
    editChangesRequested,
    setEditChangesRequested,
    mode,
    setMode,
    draft,
    setDraft,
    verify,
    setVerify,
  };
}

export default useNsFeedback;

type UseNsFeedbackControllerAddress = string | null | undefined;

type UseNsFeedbackControllerResult = {
  mode: string;
  uri: string;
  verifyUri: string;
  memo: string;
  amount: string;
  verifyMemo: string;
  verifyAmount: string;
  selectedAddress: string | null;
  copyUri: () => Promise<void>;
  openWallet: () => void;
  setVerifyId: (value: number | null) => void;
  setVerifyRequestId: (value: string | null) => void;
  setDraftMemo: (value: string | null) => void;
  setDraftAmount: (value: string | null) => void;
  setVerifyMemo: (value: string | null) => void;
  setVerifyAmount: (value: string | null) => void;
  setMode: (value: string) => void;
};

export function useNsFeedbackController(
  address?: UseNsFeedbackControllerAddress
): UseNsFeedbackControllerResult {
  const {
    selectedAddress,
    draft,
    verify,
    pendingEdits,
    setDraft,
    setVerify,
    setMode,
    mode,
  } = useNsFeedback();

  // Derived setters
  const setDraftMemo = useCallback((value: string | null) => {
    setDraft((prev) => ({ ...prev, memo: value ?? '' }));
  }, [setDraft]);

  const setDraftAmount = useCallback((value: string | null) => {
    setDraft((prev) => ({ ...prev, amount: value ?? '' }));
  }, [setDraft]);

  const setVerifyMemo = useCallback((value: string | null) => {
    setVerify((prev) => ({ ...prev, memo: value ?? '' }));
  }, [setVerify]);

  const setVerifyAmount = useCallback((value: string | null) => {
    setVerify((prev) => ({ ...prev, amount: value ?? '' }));
  }, [setVerify]);

  const setVerifyId = useCallback((value: number | null) => {
    setVerify((prev) => ({ ...prev, zId: value }));
  }, [setVerify]);

  const setVerifyRequestId = useCallback((value: string | null) => {
    setVerify((prev) => ({ ...prev, requestId: value }));
  }, [setVerify]);

  const effectiveAddress = address ?? selectedAddress;

  useEffect(() => {
    if (mode !== "signin") return;

    const zId = verify.zId || null;
    if (!zId) return;
    const requestId = verify.requestId || null;

    const hasEdits =
      Boolean(pendingEdits) &&
      ((pendingEdits.profile && Object.keys(pendingEdits.profile).length > 0) ||
        (Array.isArray(pendingEdits.l) && pendingEdits.l.length > 0));

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
    return buildZcashUri(effectiveAddress ?? "", finalAmount, memo);
  }, [draft, effectiveAddress]);

  const verifyUri = useMemo(() => {
    const { memo, amount } = verify;
    return buildZcashUri(effectiveAddress ?? "", amount, memo);
  }, [verify, effectiveAddress]);

  const copyUri = useCallback(async () => {
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
    } catch {
      // Ignore clipboard failures silently
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
