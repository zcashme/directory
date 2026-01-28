import { useEffect } from "react";
import { useFeedback } from "./useFeedback";

let listenerBound = false;

export default function useFeedbackEvents() {
const { 
  setMode,
  setSelectedAddress,
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
      const { zId, address } = e.detail || {};

      if (address) setSelectedAddress(address);

      if (zId) {
        setVerifyId(zId);
        setVerifyMemo(`{z:${zId}}`);
      }

      setVerifyRequestId(null);
      setVerifyAmount("0");
      setMode("signin");
    };

    const handleDraft = () => setMode("note");

const handleAddressSelect = (e) => {
  if (!e.detail?.address) return;

  const addr = e.detail.address;
  setSelectedAddress(addr);

  // Reset all feedback + verification state
  setMode("note");
  setVerifyMemo("");
  setVerifyAmount("0");
  setVerifyRequestId(null);

  // 🔥 MOST IMPORTANT FIX:
  // Clear all QR-activation state or the QR block reopens on next render
  setForceShowQR(null);
  // setQRShown(false); // REMOVE THIS: it's not defined in this scope
};

    const handlePendingEdits = (e) => {
      if (!e.detail) return;
      try {
        setPendingEdits(e.detail);
      } catch (err) {
        console.error("pendingEdits handler error:", err);
      }
    };

    window.addEventListener("enterSignInMode", handleSignIn);
    window.addEventListener("enterDraftMode", handleDraft);
    window.addEventListener("selectAddress", handleAddressSelect);
    window.addEventListener("pendingEditsUpdated", handlePendingEdits);

    console.log("✅ useFeedbackEvents listeners bound once");
  }, [
    setMode,
    setSelectedAddress,
    setPendingEdits,
    setVerifyId,
    setVerifyMemo,
    setVerifyAmount,
    setVerifyRequestId,
    setForceShowQR,
  ]);
}
