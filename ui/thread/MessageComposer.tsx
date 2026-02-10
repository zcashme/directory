"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { Profile } from "@/lib/profile/types";
import { useThreadStore } from "@/lib/stores/thread";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import { buildZcashUri } from "@/lib/zcash/zcashUtils";
import {
  buildThreadMemo,
  serializeThreadMemo,
  getMessageSizeError,
  formatMessageByteDisplay,
  MAX_MESSAGE_CHARS,
} from "@/lib/thread/buildThreadMemo";
import { startThreadMessageAction } from "@/lib/thread/actions";

interface MessageComposerProps {
  profile: Profile;
}

function MessageCounter({ text, zcasherId }: { text: string; zcasherId: number }) {
  const display = useMemo(
    () => formatMessageByteDisplay(text, zcasherId),
    [text, zcasherId]
  );

  const error = useMemo(
    () => getMessageSizeError(text, zcasherId),
    [text, zcasherId]
  );

  return (
    <div className="absolute bottom-3 right-3">
      <div className={`text-sm ${error ? "text-red-600 font-semibold" : "text-gray-400"}`}>
        {error || display}
      </div>
    </div>
  );
}

export default function MessageComposer({ profile }: MessageComposerProps) {
  const {
    messageComposition,
    setMessageComposition,
    verifyQrEnabled,
    setVerifyQrEnabled,
    setCurrentRequestId,
    setPollStatus,
  } = useThreadStore();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [memoUri, setMemoUri] = useState<string | null>(null);

  // Generate request ID on component mount
  useEffect(() => {
    const id = `thread_${profile.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setRequestId(id);
  }, [profile.id]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [messageComposition]);

  // Build memo object
  const memo = useMemo(() => {
    if (!profile?.id) return null;
    return buildThreadMemo(messageComposition, profile.id);
  }, [messageComposition, profile?.id]);

  // Build URI for signing
  const uri = useMemo(() => {
    if (!memo || !profile?.address) return null;
    const memoString = serializeThreadMemo(memo);
    return buildZcashUri(profile.address, "0", memoString);
  }, [memo, profile?.address]);

  // Check for errors
  const sizeError = useMemo(
    () => getMessageSizeError(messageComposition, profile?.id || 0),
    [messageComposition, profile?.id]
  );

  const canSubmit =
    messageComposition.trim().length > 0 &&
    messageComposition.length <= MAX_MESSAGE_CHARS &&
    !sizeError &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !requestId || !uri) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await startThreadMessageAction(
        profile.id,
        messageComposition.trim(),
        profile.address,
        requestId
      );

      if (!result.ok) {
        setError(result.error || "Failed to start message verification");
        setIsSubmitting(false);
        return;
      }

      // Show QR code
      setVerifyQrEnabled(true);
      setCurrentRequestId(requestId);
      setPollStatus("waiting_for_signature");

      // Open wallet with URI
      setTimeout(() => {
        if (uri) {
          window.open(uri, "_blank");
        }
      }, 500);
    } catch (err) {
      console.error("Error submitting message:", err);
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleOpenWallet = () => {
    if (uri) {
      window.open(uri, "_blank");
    }
  };

  // Disabled for transparent addresses
  const disabled = profile?.address?.startsWith("t");

  if (disabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-800">
        <p className="font-semibold mb-1">Cannot post messages</p>
        <p className="text-sm">Thread messages require a shielded Zcash address.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Post a Message</h2>
      </div>

      {/* Message input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={messageComposition}
          onChange={(e) => setMessageComposition(e.target.value)}
          placeholder="What's on your mind? (max 400 chars)"
          className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 transition-all ${
            sizeError
              ? "border-red-300 focus:ring-red-500 bg-red-50"
              : "border-gray-200 focus:ring-blue-500 focus:border-blue-300"
          }`}
          style={{ minHeight: "100px", maxHeight: "200px" }}
        />
        <MessageCounter text={messageComposition} zcasherId={profile?.id || 0} />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          canSubmit
            ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isSubmitting ? "Creating QR code..." : "Post Message"}
      </button>

      {/* QR Code section */}
      {verifyQrEnabled && uri && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Sign with your wallet</h3>
            <p className="text-sm text-gray-700 mb-4">
              Scan the QR code below with your Zcash wallet, or click "Open Wallet" to sign your
              message.
            </p>
          </div>

          <QrUriBlock
            uri={uri}
            profileName={profile.display_name || profile.name}
            forceShowQR={true}
            defaultShowQR={true}
          />

          <button
            onClick={handleOpenWallet}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Open Wallet
          </button>

          <div className="bg-white border border-blue-200 rounded p-3 text-xs text-gray-700">
            <p className="font-semibold mb-1">Next steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your Zcash wallet</li>
              <li>Scan or paste the transaction request</li>
              <li>Send a 0 ZEC transaction (memo only)</li>
              <li>You'll receive an OTP to confirm</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
