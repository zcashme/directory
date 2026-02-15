import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/profile/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";

import SubmitOtp from "@/ui/verification/SubmitOtp";
import InlineOtpForm from "@/ui/verification/InlineOtpForm";
import { buildZcashUri } from "@/lib/zcash/zcashUtils";

import useVerificationPolling from "@/ui/verification/useVerificationPolling";
import ProgressStep from "@/ui/verification/ProgressStep";
import { useMessagingStore } from "@/ui/verification/store";
import { Alert } from "@/ui/common";

const SIGNIN_ADDR = "u1lff6xhc9p2c3aefrms5624aqd5mdlys87xcu0u0g3rynnjfs4g5nf0u5q8sczex3jctc2xesauktvdr9gd77zauaejje3zrdpj4uppssdmzzu33lfkzc9y0hlq7rt94kt4rqpq6d4h8a0px597htclme3pav3wft4k94u4pqqn3h4dmdp8wcvvumgqak5ynwy7qm6e797t356ud38we";

const MIN_SIGNIN_AMOUNT = 0.001;
const DEFAULT_SIGNIN_AMOUNT = (MIN_SIGNIN_AMOUNT * 3).toFixed(3);

interface ProfileVerificationProps {
  profile: Profile;
}

export default function ProfileVerification({
  profile,
}: ProfileVerificationProps) {
  const verify = useMessagingStore(state => state.verify);
  const verifyQrEnabled = useMessagingStore(state => state.verifyQrEnabled);
  const pollStatus = useMessagingStore(state => state.pollStatus);
  const pollOtpPhase = useMessagingStore(state => state.pollOtpPhase);
  const otpInlineSuccess = useMessagingStore(state => state.otpInlineSuccess);
  const pollDebug = useMessagingStore(state => state.pollDebug);
  const setVerify = useMessagingStore(state => state.setVerify);
  const setVerifyQrEnabled = useMessagingStore(state => state.setVerifyQrEnabled);
  const resetVerificationPolling = useMessagingStore(state => state.resetVerificationPolling);

  // Simple memo with profile ID for ZVS verification
  const memo = useMemo(() => {
    const zId = verify.zId ?? profile.id ?? null;
    if (!zId) return "";
    return String(zId);
  }, [profile.id, verify.zId]);

  const amount = verify?.amount ?? DEFAULT_SIGNIN_AMOUNT;

  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [showFooterHelp, setShowFooterHelp] = useState(false);

  const {
    startPolling,
    progressSteps,
    progressState,
    progressPercent,
    progressBarClass,
    statusLine,
    otpPhaseSteps,
    showOtpPhaseLine,
    progressExplainer,
    handleInlineOtpSuccess,
  } = useVerificationPolling();

  useEffect(() => {
    resetVerificationPolling();
  }, [resetVerificationPolling]);

  const { validAmount, error, verifyUri } = useMemo(() => {
    const cleaned = (amount ?? "").trim();
    const raw = cleaned.replace(/[^\d.]/g, "");
    const num = parseFloat(raw);
    const validMin = !Number.isNaN(num) && num >= MIN_SIGNIN_AMOUNT;
    const uri = buildZcashUri(
      SIGNIN_ADDR,
      raw,
      memo
    );
    return {
      validAmount: validMin,
      error: validMin
        ? ""
        : `Authentication requires at least ${MIN_SIGNIN_AMOUNT} ZEC`,
      verifyUri: uri
    };
  }, [amount, memo]);

  useEffect(() => {
    if (pollStatus === "matched") setShowFooterHelp(false);
  }, [pollStatus]);

  const handleGenerateQr = () => {
    if (!verifyUri || error) return;
    const zid = verify?.zId ?? profile?.id;
    if (!zid) return;
    setVerifyQrEnabled(true);
    void startPolling(String(zid));
  };

  const handleCopyDebug = () => {
    if (!pollDebug) return;
    void navigator.clipboard.writeText(pollDebug).catch(() => {});
  };

  return (
    <>
      <div className="bg-transparent border-none shadow-none p-0 mt-1">


        {/* Header */}
        <div className="text-left mb-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">

            <span>
              To verify, send from {" "}
              <span
                className="text-blue-600 cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                {profile?.name ?? "Your profile"}
              </span>
            </span>

            {/* removed amount requirement + help from header */}
          </h3>
        </div>

        {/* Memo Display */}
        <div className="relative group w-full mb-1">
          <div className="block -mx-0 -mt-0 mb-2 px-3 py-2 bg-gray-800 border-b border-black/30 rounded-t-xl text-center">
            <span className="block text-[12px] text-gray-200">
              Send to verify your address ownership
            </span>
          </div>
          <textarea
            value={memo ?? ""}
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
            style={{ minHeight: "3rem", lineHeight: "1.35" }}
          />
        </div>

        {/* Amount + Wallet */}
        <div className="mt-3 w-full">
          <AmountAndWallet
            amount={amount}
            setAmount={(amount) => setVerify((prev) => ({ ...prev, amount }))}
            openWallet={handleGenerateQr}
            openWalletLabel="Generate QR"
          />
          {!validAmount && error && (
            <Alert variant="error" size="sm" message={error} className="mt-1" />
          )}
        </div>

        {showFooterHelp && (
          <p className="mx-1 mt-2 mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-snug">
            You must open and send this message from your wallet. Once received, we will reply with a 6-digit OTP.
            {" "}
            <button
              type="button"
              onClick={() => setIsOtpOpen(true)}
              className="font-semibold text-blue-600 underline cursor-pointer"
            >
              Enter the OTP
            </button>
            {" "}
            before it expires to complete verification and apply your edits.
          </p>
        )}
        {/* Requirement line under help, above QR divider */}
        <div className="w-full flex items-center justify-center gap-2 text-center mt-1 mb-4">
          <p className="text-[12px] text-gray-600 italic m-0">
            Include at least {MIN_SIGNIN_AMOUNT} ZEC — Do not modify message
          </p>

          <button
            type="button"
            onClick={() => setShowFooterHelp(!showFooterHelp)}
            className="text-[12px] font-semibold text-blue-600 underline m-0"
          >
            {showFooterHelp ? "Hide help" : "Help"}
          </button>
        </div>

        {/* Divider + centered QR/URI (matches Draft EXACTLY) */}
        <div className="border-t border-black/10 mt-4 pt-4">
          {verifyUri && !error && verifyQrEnabled && verify?.requestId && (
            <div className="-mt-2 flex justify-center">
              <QrUriBlock
                uri={verifyUri}
                profileName="verification"
              />
            </div>
          )}
          {verifyQrEnabled && (
            <div className="mt-3 text-center text-xs text-gray-600">
              {statusLine}
            </div>
          )}
          {verifyQrEnabled && (
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                <div
                  className={`h-full ${progressBarClass} transition-all duration-300`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center">
                {progressSteps.map((step, idx) => (
                  <ProgressStep
                    key={step.key}
                    isLast={idx === progressSteps.length - 1}
                    isCurrent={progressState.currentIndex === idx}
                    showCheckmark={idx < progressState.doneCount}
                    label={step.label}
                    className={progressState.currentIndex === idx ? "font-bold text-blue-700" : ""}
                  />
                ))}
              </div>
              {showOtpPhaseLine && (
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {otpPhaseSteps.map((step, idx) => (
                    <ProgressStep
                      key={step.phase}
                      isLast={idx === otpPhaseSteps.length - 1}
                      isCurrent={step.isCurrent}
                      showCheckmark={step.showGreenCheck}
                      showFailed={!step.showGreenCheck && step.isCurrent && step.failed}
                      label={step.phase}
                      className={step.isCurrent ? "font-bold text-blue-700" : ""}
                    />
                  ))}
                </div>
              )}
              {(pollOtpPhase ?? "").toLowerCase() === "sent" && (
                <div className="mt-2 text-xs text-green-700 text-center font-semibold">
                  OTP sent, check your wallet for your one-time passcode
                </div>
              )}
              {verifyQrEnabled && (
                <div className="mt-1 text-xs text-gray-500 text-center italic">
                  {progressExplainer}
                </div>
              )}
              {(pollOtpPhase ?? "").toLowerCase() === "sent" && !otpInlineSuccess && (
                <InlineOtpForm profile={profile} onSuccess={handleInlineOtpSuccess} />
              )}
            </div>
          )}
          {verifyQrEnabled && pollDebug && (
            <div className="mt-2">
              <div className="mb-1 flex justify-end">
                <button
                  type="button"
                  className="text-xs font-semibold text-blue-600 underline"
                  onClick={handleCopyDebug}
                >
                  Copy
                </button>
              </div>
              <textarea
                className="w-full text-xs border border-black/10 rounded-lg p-2 text-gray-700"
                rows={4}
                readOnly
                value={pollDebug}
              />
            </div>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      {isOtpOpen && (
        <SubmitOtp
          isOpen={isOtpOpen}
          onClose={() => setIsOtpOpen(false)}
          profile={profile}
        />
      )}
    </>
  );
}
