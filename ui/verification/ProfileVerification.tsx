import { useMemo, useState, useCallback } from "react";
import type { Profile } from "@/lib/profile/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import { OtpInput } from "@/ui/verification/OtpInput";
import { buildZcashUri } from "@/lib/zcash/zcashUtils";
import { buildZvsMemo, generateSessionId } from "@/lib/verification/session";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
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
  // Local UI state
  const [amount, setAmount] = useState(DEFAULT_SIGNIN_AMOUNT);
  const [qrVisible, setQrVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [otpResult, setOtpResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Track the current memo (in React state only - no DB persistence)
  const [currentMemo, setCurrentMemo] = useState("");
  const [currentUri, setCurrentUri] = useState("");

  const userAddress = profile?.address ?? "";

  // Validate amount
  const { validAmount, amountError } = useMemo(() => {
    const cleaned = (amount ?? "").trim();
    const raw = cleaned.replace(/[^\d.]/g, "");
    const num = parseFloat(raw);
    const validMin = !Number.isNaN(num) && num >= MIN_SIGNIN_AMOUNT;

    return {
      validAmount: validMin,
      amountError: validMin
        ? ""
        : `Authentication requires at least ${MIN_SIGNIN_AMOUNT} ZEC`,
    };
  }, [amount]);

  // Generate QR - creates memo in React state (no DB persistence)
  const handleGenerateQr = useCallback(() => {
    if (!validAmount || !userAddress) return;

    setError("");
    setOtpResult(null);
    setOtp("");

    // Generate new session ID and memo
    const newSessionId = generateSessionId();
    const newMemo = buildZvsMemo(newSessionId, userAddress);
    const newUri = buildZcashUri(SIGNIN_ADDR, amount.replace(/[^\d.]/g, ""), newMemo);

    setCurrentMemo(newMemo);
    setCurrentUri(newUri);
    setQrVisible(true);
  }, [validAmount, userAddress, amount]);

  // Handle OTP submission
  const handleSubmitOtp = useCallback(async () => {
    if (!otp.trim() || !profile.id || !currentMemo) return;

    setIsSubmitting(true);
    setOtpResult(null);
    setError("");

    try {
      const response = await confirmOtpAction(profile.id, otp.trim(), currentMemo);

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
  }, [otp, profile.id, currentMemo]);

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

      {/* Memo Display - shown after generation */}
      {currentMemo && (
        <div className="relative group w-full mb-3">
          <div className="block px-3 py-2 bg-gray-800 rounded-t-xl text-center">
            <span className="block text-[12px] text-gray-200">
              Memo (do not modify)
            </span>
          </div>
          <textarea
            value={currentMemo}
            readOnly
            rows={4}
            className="
              w-full
              border border-[#000000]/90
              border-t-0
              rounded-b-xl
              px-3 py-2
              text-[12px]
              bg-gray-50
              text-gray-800
              font-mono
              resize-none
              cursor-default
              break-all
              overflow-y-auto
            "
          />
        </div>
      )}

      {/* Amount + Generate QR */}
      <div className="mt-3 w-full">
        <AmountAndWallet
          amount={amount}
          setAmount={setAmount}
          openWallet={handleGenerateQr}
          openWalletLabel="Generate QR"
        />
        {!validAmount && amountError && (
          <Alert variant="error" size="sm" message={amountError} className="mt-1" />
        )}
      </div>

      {/* Requirement line */}
      <div className="w-full flex items-center justify-center gap-2 text-center mt-1 mb-4">
        <p className="text-[12px] text-gray-600 italic m-0">
          Include at least {MIN_SIGNIN_AMOUNT} ZEC
        </p>
      </div>

      {/* Error display (for session creation errors) */}
      {error && !qrVisible && (
        <Alert variant="error" size="sm" message={error} className="mt-2" />
      )}

      {/* QR Code Display */}
      {qrVisible && currentUri && (
        <div className="border-t border-black/10 mt-4 pt-4">
          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <QrUriBlock uri={currentUri} profileName="verification" />
          </div>

          {/* OTP Entry Section - shown immediately with QR */}
          <div className="mt-4 border border-black/10 rounded-xl p-4 bg-white/80">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Enter your 6-digit verification code
            </div>
            <p className="text-xs text-gray-500 mb-3">
              After sending the transaction, enter the code you receive in your wallet.
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

            {/* Error display */}
            {error && (
              <Alert variant="error" size="sm" message={error} className="mt-2" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
