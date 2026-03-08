"use client";

import { useState, useCallback } from "react";
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
}

export default function MaxiUpgrade({ profile }: MaxiUpgradeProps) {
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
        setQrVisible(true);
      } else {
        setError(result.error ?? "Failed to generate QR code.");
      }
    } catch {
      setError("Failed to generate QR code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [profile?.id]);

  const handleSubmitOtp = useCallback(async () => {
    const otpValue = otp.trim();
    if (otpValue.length !== 6 || !profile.id || !currentMemo) return;

    if (otpAttemptsLeft <= 0) {
      setOtpResult({ ok: false, message: "Too many attempts. Please generate a new QR code." });
      return;
    }

    setIsSubmitting(true);
    setOtpResult(null);
    setError("");

    try {
      const response = await confirmMaxiOtpAction(profile.id, otpValue, currentMemo);

      if (response.ok) {
        setOtpResult({ ok: true, message: "Upgrade successful! Refreshing..." });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const remaining = otpAttemptsLeft - 1;
        setOtpAttemptsLeft(remaining);
        setOtp("");

        if (remaining <= 0) {
          setOtpResult({ ok: false, message: "Too many attempts. Please generate a new QR code." });
          setQrVisible(false);
        } else {
          setOtpResult({
            ok: false,
            message: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
          });
        }
      }
    } catch {
      setOtpResult({ ok: false, message: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, profile.id, currentMemo, otpAttemptsLeft]);

  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const isOtpComplete = otp.trim().length === 6;
  const showQrSection = qrVisible && !!currentUri;

  return (
    <div className="w-full bg-transparent border-none shadow-none p-0">
      {!qrVisible && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleGenerateQr}
            disabled={isGenerating}
            className="w-full py-3 rounded-xl bg-[var(--color-brand-blue)] text-white font-semibold hover:bg-[var(--color-brand-blue)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Pay 1 ZEC to Upgrade"}
          </button>
        </div>
      )}

      {error && !qrVisible && (
        <Alert variant="error" size="sm" message={error} className="mt-2" />
      )}

      <div className={`w-full overflow-hidden transition-[max-height,opacity] duration-350 ease-out ${showQrSection ? "mt-1 pt-1 max-h-[1200px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="flex justify-center mb-4">
          <QrUriBlock
            uri={currentUri}
            profileName="maxi-upgrade"
            qrTopHintText="Send 1 ZEC to receive your upgrade code."
            qrHintText="Scan or Tap QR"
            compactTopSpacing
          />
        </div>

        <div className="relative w-full max-w-[300px] mx-auto border border-gray-800 rounded-xl p-3 bg-transparent">
          <div className="space-y-3">
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
              className={`${OUTLINE_ACTION_BUTTON_CLASSES} w-full justify-center px-3 py-2 bg-[var(--color-brand-blue)] border-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-blue)]/90 hover:border-[var(--color-brand-blue)]/90 font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!isOtpComplete || isSubmitting}
            >
              {isSubmitting ? "Upgrading..." : "Confirm Upgrade"}
            </button>
          </div>

          {otpResult && (
            <div className={`mt-3 text-sm font-semibold ${otpResult.ok ? "text-green-700" : "text-red-600"}`}>
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
