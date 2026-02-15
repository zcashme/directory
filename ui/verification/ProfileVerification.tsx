import { useEffect, useMemo, useState, useCallback } from "react";
import type { Profile } from "@/lib/profile/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import { OtpInput } from "@/ui/verification/OtpInput";
import { buildZcashUri } from "@/lib/zcash/zcashUtils";
import { generateSessionId, buildZvsMemo } from "@/lib/verification/session";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import { createVerificationSession } from "@/lib/verification/verificationSessionAction";
import { useMessagingStore } from "@/ui/verification/store";
import Alert from "@/ui/common/feedback/Alert";
import Button from "@/ui/common/buttons/Button";

const SIGNIN_ADDR = "u1lff6xhc9p2c3aefrms5624aqd5mdlys87xcu0u0g3rynnjfs4g5nf0u5q8sczex3jctc2xesauktvdr9gd77zauaejje3zrdpj4uppssdmzzu33lfkzc9y0hlq7rt94kt4rqpq6d4h8a0px597htclme3pav3wft4k94u4pqqn3h4dmdp8wcvvumgqak5ynwy7qm6e797t356ud38we";

const MIN_SIGNIN_AMOUNT = 0.001;
const DEFAULT_SIGNIN_AMOUNT = "0.003";

interface ProfileVerificationProps {
  profile: Profile;
}

export default function ProfileVerification({
  profile,
}: ProfileVerificationProps) {
  const verify = useMessagingStore(state => state.verify);
  const verifyQrEnabled = useMessagingStore(state => state.verifyQrEnabled);
  const verificationError = useMessagingStore(state => state.verificationError);
  const setVerify = useMessagingStore(state => state.setVerify);
  const setVerifyQrEnabled = useMessagingStore(state => state.setVerifyQrEnabled);
  const setVerificationError = useMessagingStore(state => state.setVerificationError);
  const resetVerification = useMessagingStore(state => state.resetVerification);

  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpResult, setOtpResult] = useState<{ ok: boolean; message: string } | null>(null);

  const amount = verify?.amount ?? DEFAULT_SIGNIN_AMOUNT;
  const userAddress = profile?.address ?? "";

  // Build the memo from session_id and user address
  const memo = useMemo(() => {
    if (!verify.sessionId || !userAddress) return "";
    return buildZvsMemo(verify.sessionId, userAddress);
  }, [verify.sessionId, userAddress]);

  // Reset verification state on mount
  useEffect(() => {
    resetVerification();
  }, [resetVerification]);

  // Validate amount
  const { validAmount, error, verifyUri } = useMemo(() => {
    const cleaned = (amount ?? "").trim();
    const raw = cleaned.replace(/[^\d.]/g, "");
    const num = parseFloat(raw);
    const validMin = !Number.isNaN(num) && num >= MIN_SIGNIN_AMOUNT;

    const uri = memo ? buildZcashUri(SIGNIN_ADDR, raw, memo) : "";

    return {
      validAmount: validMin,
      error: validMin
        ? ""
        : `Authentication requires at least ${MIN_SIGNIN_AMOUNT} ZEC`,
      verifyUri: uri,
    };
  }, [amount, memo]);

  // Generate QR - creates a new session and stores it in Supabase
  const handleGenerateQr = useCallback(async () => {
    if (!validAmount || !userAddress) return;

    const sessionId = generateSessionId();
    const newMemo = buildZvsMemo(sessionId, userAddress);

    // Store the session in Supabase for later verification
    const result = await createVerificationSession(
      profile.id,
      sessionId,
      newMemo,
      {} // TODO: Add pending edits here
    );

    if (!result.ok) {
      setVerificationError(result.error || "Failed to create verification session");
      return;
    }

    setVerify((prev) => ({
      ...prev,
      zId: profile.id,
      sessionId,
      userAddress,
    }));
    setVerifyQrEnabled(true);
    setOtp("");
    setOtpResult(null);
  }, [validAmount, userAddress, profile.id, setVerify, setVerifyQrEnabled, setVerificationError]);

  // Handle OTP submission
  const handleSubmitOtp = useCallback(async () => {
    if (!otp.trim() || !profile.id) return;

    setIsSubmitting(true);
    setOtpResult(null);
    setVerificationError("");

    try {
      const response = await confirmOtpAction(profile.id, otp.trim());

      if (response.ok) {
        setOtpResult({ ok: true, message: "Verification successful! Refreshing..." });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setOtpResult({
          ok: false,
          message: response.error || "Invalid verification code.",
        });
      }
    } catch (err) {
      setOtpResult({ ok: false, message: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, profile.id, setVerificationError]);

  // Handle OTP input change - strip non-digits
  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  return (
    <div className="bg-transparent border-none shadow-none p-0 mt-1">
      {/* Header */}
      <div className="text-left mb-2">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>
            To verify, send from{" "}
            <span
              className="text-blue-600 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              {profile?.name ?? "Your profile"}
            </span>
          </span>
        </h3>
      </div>

      {/* Memo Display */}
      {memo && verifyQrEnabled && (
        <div className="relative group w-full mb-1">
          <div className="block -mx-0 -mt-0 mb-2 px-3 py-2 bg-gray-800 border-b border-black/30 rounded-t-xl text-center">
            <span className="block text-[12px] text-gray-200">
              Memo (do not modify)
            </span>
          </div>
          <textarea
            value={memo}
            readOnly
            className="
              w-full
              border border-[#000000]/90
              rounded-b-xl
              px-3 py-2
              text-[14px]
              bg-gray-50
              text-gray-800
              font-mono
              resize-none
              cursor-default
            "
            style={{ minHeight: "4rem", lineHeight: "1.35" }}
          />
        </div>
      )}

      {/* Amount + Generate QR */}
      <div className="mt-3 w-full">
        <AmountAndWallet
          amount={amount}
          setAmount={(amt) => setVerify((prev) => ({ ...prev, amount: amt }))}
          openWallet={handleGenerateQr}
          openWalletLabel="Generate QR"
        />
        {!validAmount && error && (
          <Alert variant="error" size="sm" message={error} className="mt-1" />
        )}
      </div>

      {/* Requirement line */}
      <div className="w-full flex items-center justify-center gap-2 text-center mt-1 mb-4">
        <p className="text-[12px] text-gray-600 italic m-0">
          Include at least {MIN_SIGNIN_AMOUNT} ZEC
        </p>
      </div>

      {/* QR Code Display */}
      {verifyQrEnabled && verifyUri && (
        <div className="border-t border-black/10 mt-4 pt-4">
          <div className="-mt-2 flex justify-center">
            <QrUriBlock uri={verifyUri} profileName="verification" />
          </div>

          {/* OTP Entry Section */}
          <div className="mt-6 border border-black/10 rounded-xl p-4 bg-white/80">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Enter your 6-digit verification code
            </div>
            <p className="text-xs text-gray-500 mb-3">
              After sending the transaction, you will receive a 6-digit code.
              Enter it below to complete verification.
            </p>

            <div className="flex gap-2">
              <OtpInput
                id="verification-otp"
                value={otp}
                onChange={handleOtpChange}
                onSubmit={handleSubmitOtp}
                placeholder="Enter 6-digit code"
                hideLabel={true}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                onClick={handleSubmitOtp}
                variant="primary"
                size="md"
                disabled={!otp.trim() || isSubmitting}
              >
                {isSubmitting ? "Verifying..." : "Submit"}
              </Button>
            </div>

            {/* Result message */}
            {otpResult && (
              <div
                className={`mt-3 text-sm font-semibold ${
                  otpResult.ok ? "text-green-700" : "text-red-600"
                }`}
              >
                {otpResult.message}
              </div>
            )}

            {/* Verification error */}
            {verificationError && (
              <Alert variant="error" size="sm" message={verificationError} className="mt-2" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
