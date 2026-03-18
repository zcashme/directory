"use client";

import { useState, useCallback, useEffect } from "react";
import type { Profile } from "@/lib/profile/types";
import { generateMaxiMemoAction } from "@/lib/verification/generateMaxiMemoAction";
import { confirmMaxiOtpAction } from "@/lib/verification/confirmMaxiOtpAction";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import { OtpInput } from "@/ui/verification/OtpInput";
import Alert from "@/ui/common/feedback/Alert";
import { OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";

interface MaxiUpgradeProps {
  profile: Profile;
  onClose?: () => void;
  onFlowExpandedChange?: (expanded: boolean) => void;
  onRegisterCollapseAction?: (action: () => void) => void;
}

export default function MaxiUpgrade({ profile, onFlowExpandedChange, onRegisterCollapseAction }: MaxiUpgradeProps) {
  const [qrVisible, setQrVisible] = useState(false);
  const [currentMemo, setCurrentMemo] = useState("");
  const [currentUri, setCurrentUri] = useState("");
  const [otp, setOtp] = useState("");
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [otpResult, setOtpResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleGenerateQr = useCallback(async () => {
    if (!profile?.id) return;
    setError("");
    setOtpResult(null);
    setOtp("");
    setOtpAttemptsLeft(5);
    setIsGenerating(true);

    try {
      const result = await generateMaxiMemoAction(profile.id);

      if (result.ok && result.memo && result.uri) {
        setCurrentMemo(result.memo);
        setCurrentUri(result.uri);
        onFlowExpandedChange?.(true);
        setQrVisible(true);
      } else {
        setError(result.error ?? "Failed to generate QR code. Try again.");
        onFlowExpandedChange?.(false);
      }
    } catch {
      setError("Failed to generate QR code. Try again.");
      onFlowExpandedChange?.(false);
    } finally {
      setIsGenerating(false);
    }
  }, [profile?.id, onFlowExpandedChange]);

  const handleSubmitOtp = useCallback(async () => {
    const otpValue = otp.trim();
    if (otpValue.length !== 6 || !profile.id || !currentMemo) return;

    if (otpAttemptsLeft <= 0) {
      setOtpResult({ ok: false, message: "Too many attempts. Generate a new QR." });
      return;
    }

    setIsSubmitting(true);
    setOtpResult(null);
    setError("");

    try {
      const response = await confirmMaxiOtpAction(profile.id, otpValue, currentMemo);

      if (response.ok) {
        setOtpResult({ ok: true, message: "You own your name. Refreshing..." });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const remaining = otpAttemptsLeft - 1;
        setOtpAttemptsLeft(remaining);
        setOtp("");

        if (remaining <= 0) {
          setOtpResult({ ok: false, message: "Too many attempts. Generate a new QR." });
          setQrVisible(false);
          onFlowExpandedChange?.(false);
        } else {
          setOtpResult({
            ok: false,
            message: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
          });
        }
      }
    } catch {
      setOtpResult({ ok: false, message: "Something went wrong. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, profile.id, currentMemo, otpAttemptsLeft, onFlowExpandedChange]);

  const collapseToPayButton = useCallback(() => {
    setQrVisible(false);
    setCurrentMemo("");
    setCurrentUri("");
    setOtp("");
    setOtpAttemptsLeft(5);
    setOtpResult(null);
    setError("");
    onFlowExpandedChange?.(false);
  }, [onFlowExpandedChange]);

  useEffect(() => {
    onRegisterCollapseAction?.(collapseToPayButton);
  }, [onRegisterCollapseAction, collapseToPayButton]);

  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const isOtpComplete = otp.trim().length === 6;
  const showQrSection = qrVisible && !!currentUri;
  const nameRegistrationHint = "Send 1 ZEC to register your name on-chain.";
  const claimNameRaw = (profile.name ?? "").trim() || "zcasher.name";
  const claimName = claimNameRaw.charAt(0).toUpperCase() + claimNameRaw.slice(1).toLowerCase();

  return (
    <div className="w-full bg-transparent border-none shadow-none p-0">
      {!qrVisible && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleGenerateQr}
            disabled={isGenerating}
            className="w-full py-3 rounded-xl border border-amber-100/50 bg-[linear-gradient(135deg,rgba(21,128,61,0.96)_0%,rgba(16,185,129,0.92)_55%,rgba(234,179,8,0.75)_100%)] text-amber-50 font-semibold shadow-[0_10px_26px_-14px_rgba(234,179,8,0.8),inset_0_1px_0_rgba(255,255,255,0.24)] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : `Pay 1 ZEC to Upgrade`}
          </button>
        </div>
      )}

      {error && !qrVisible && (
        <Alert variant="error" size="sm" message={error} className="mt-2" />
      )}

      <div className={`w-full overflow-hidden transition-[max-height,opacity] duration-350 ease-out ${showQrSection ? "mt-3 pt-1 max-h-[1200px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="relative mb-3 flex w-full flex-col items-center overflow-hidden rounded-2xl border border-white/45 bg-white/28 px-3 pb-2 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm transition-all">
          <QrUriBlock
            uri={currentUri}
            memoText={currentMemo}
            profileName="maxi-upgrade"
            qrTopHintText="Send to claim your name"
            qrTopHintDetails={[
              nameRegistrationHint,
              "Stay on this page to enter your code.",
            ]}
            qrTopHintToggleLabel="Help"
            qrHintText="Scan or tap QR"
            compactTopHintToQrSpacing
            compactTopSpacing
          />
        </div>

        <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-white/45 bg-white/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-sm transition-all">
          <div className="space-y-3">
            <p className="text-center text-xs font-normal text-gray-700">
              Enter the code sent to your address.
            </p>
            <OtpInput
              id="maxi-otp"
              value={otp}
              onChange={handleOtpChange}
              onSubmit={handleSubmitOtp}
              placeholder="Enter 6-digit code"
              hideLabel
              className="w-full"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={handleSubmitOtp}
              className={`${OUTLINE_ACTION_BUTTON_CLASSES} w-full justify-center px-3 py-2 border-amber-100/50 text-amber-50 bg-[linear-gradient(140deg,rgba(21,128,61,0.96)_0%,rgba(234,179,8,0.68)_100%)] hover:brightness-110 font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!isOtpComplete || isSubmitting}
            >
              {isSubmitting ? "Claiming..." : "Confirm and Claim"}
            </button>
          </div>

          {otpResult && (
            <div className={`mt-3 text-sm font-semibold ${otpResult.ok ? "text-emerald-200" : "text-rose-300"}`}>
              {otpResult.message}
            </div>
          )}

          {error && (
            <Alert variant="error" size="sm" message={error} className="mt-2" />
          )}
        </div>
      </div>
    </div>
  );
}
