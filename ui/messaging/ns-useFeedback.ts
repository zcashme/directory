import { useContext, useEffect, useMemo, useCallback } from "react";
import { NsSelectionContext } from "@/app/ns/ns-selection-provider";
import { EditsContext } from "@/app/[slug]/providers/edits-provider";
import { MessagingContext } from "@/app/[slug]/providers/messaging-provider";
import type { NsSelectionContextType } from "@/app/ns/types";
import type {
  EditsContextType,
  MessagingContextType,
} from "@/app/[slug]/providers/types";
import { buildZcashUri, buildZcashEditMemo } from "@/lib/zcash/zcashUtils";

type NsFeedbackContext = NsSelectionContextType &
  EditsContextType &
  MessagingContextType;

const ensureContext = <T,>(context: T | undefined, name: string): T => {
  if (!context) {
    throw new Error(`${name} is missing. Make sure the provider is mounted.`);
  }
  return context;
};

export function useNsFeedback(): NsFeedbackContext {
  const nsSelection = ensureContext(
    useContext(NsSelectionContext),
    "NsSelectionContext"
  );
  const edits = ensureContext(useContext(EditsContext), "EditsContext");
  const messaging = ensureContext(
    useContext(MessagingContext),
    "MessagingContext"
  );

  return {
    ...nsSelection,
    ...edits,
    ...messaging,
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
    setDraftMemo,
    setDraftAmount,
    setVerifyMemo,
    setVerifyAmount,
    setVerifyId,
    setVerifyRequestId,
    setMode,
    mode,
  } = useNsFeedback();

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
