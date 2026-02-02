import React, { useEffect, useMemo, useState } from "react";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";

import { useFeedback, useFeedbackController } from "@/lib/messaging/useFeedback";
import SubmitOtp from "@/ui/verification/SubmitOtp";
import InlineOtpForm from "@/ui/verification/InlineOtpForm";
import { buildZcashUri } from "@/lib/zcash/zcashUtils";
import { cachedProfiles } from "@/lib/directory/useProfiles";
import useVerificationPolling from "@/lib/verification/useVerificationPolling";

const SIGNIN_ADDR = "u1lff6xhc9p2c3aefrms5624aqd5mdlys87xcu0u0g3rynnjfs4g5nf0u5q8sczex3jctc2xesauktvdr9gd77zauaejje3zrdpj4uppssdmzzu33lfkzc9y0hlq7rt94kt4rqpq6d4h8a0px597htclme3pav3wft4k94u4pqqn3h4dmdp8wcvvumgqak5ynwy7qm6e797t356ud38we";
const SIGNIN_ADDR_old =
  "u12p8lslmrnrfyjtx83lu5mllghvsyt8d7cnajrj7nls05rlk9dendhrznz7wzsulth2zktfy7ynpguj53gehdgakmj0sjayud3kzl58wjx7lakm29r3t4a3qgq6elplxm5llxkdaws9t4uslvz42dycvg34n423k3s74dh0eeqx0825nzprrtrl6eaj3pmshtuj96wcq9cycy5x2ywq9";
const SIGNIN_ADDR_older =
  "u1qzt502u9fwh67s7an0e202c35mm0h534jaa648t4p2r6mhf30guxjjqwlkmvthahnz5myz2ev7neff5pmveh54xszv9njcmu5g2eent82ucpd3lwyzkmyrn6rytwsqefk475hl5tl4tu8yehc0z8w9fcf4zg6r03sq7lldx0uxph7c0lclnlc4qjwhu2v52dkvuntxr8tmpug3jntvm";

const MIN_SIGNIN_AMOUNT = 0.001;
const DEFAULT_SIGNIN_AMOUNT = (MIN_SIGNIN_AMOUNT * 3).toFixed(3);

export default function ZcashFeedbackVerify() {
  const { verifyMemo: memo, verifyAmount: amount, setVerifyAmount } =
    useFeedbackController();

  const { selectedAddress, pendingEdits, verify, setVerifyRequestId } =
    useFeedback();
  const safeProfiles = Array.isArray(cachedProfiles) ? cachedProfiles : [];
  const profile = safeProfiles.find((p) => p.address === selectedAddress);

  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [verifyQrEnabled, setVerifyQrEnabled] = useState(false);
  const [showFooterHelp, setShowFooterHelp] = useState(false);

  const {
    pollRequestId,
    pollStatus,
    pollOtpPhase,
    otpInlineSuccess,
    pollError,
    pollDebug,
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
  } = useVerificationPolling({ verifyQrEnabled, setVerifyRequestId });

  const explainerText = useMemo(() => {
    const profileEdits = pendingEdits?.profile || {};
    const deleted = Array.isArray(profileEdits?.d) ? profileEdits.d : [];
    const changedFields = [];

    const hasField = (key, token) =>
      Boolean(profileEdits?.[key]) || deleted.includes(token);

    if (hasField("name", "n")) changedFields.push("username");
    if (hasField("display_name", "h")) changedFields.push("display name");
    if (hasField("bio", "b")) changedFields.push("bio");
    if (hasField("profile_image_url", "i"))
      changedFields.push("profile image");
    if (profileEdits?.c) changedFields.push("nearest city");

    const hasLinks =
      Array.isArray(pendingEdits?.l) && pendingEdits.l.length > 0;
    if (hasLinks) changedFields.push("links");

    if (hasField("address", "a")) changedFields.push("address");

    if (changedFields.length === 0) {
      return "Waiting for edits, if any.";
    }

    const last = changedFields[changedFields.length - 1];
    const prefix = changedFields.slice(0, -1);
    const list =
      changedFields.length === 1
        ? last
        : changedFields.length === 2
          ? `${prefix[0]} and ${last}`
          : `${prefix.join(", ")}, and ${last}`;

    return `Contains requested changes to ${list}.`;
  }, [pendingEdits]);

  useEffect(() => {
    const trimmed = (amount || "").trim();
    if (!trimmed || trimmed === "0") {
      setVerifyAmount(DEFAULT_SIGNIN_AMOUNT);
    }
  }, [amount, setVerifyAmount]);

  useEffect(() => {
    setVerifyQrEnabled(false);
  }, [pendingEdits]);

  const { validAmount, error, verifyUri } = useMemo(() => {
    const cleaned = (amount || "").trim();
    const raw = cleaned.replace(/[^\d.]/g, "");
    const num = parseFloat(raw);
    const validMin = !Number.isNaN(num) && num >= MIN_SIGNIN_AMOUNT;
    const uri = buildZcashUri(
      SIGNIN_ADDR,
      raw,
      memo && memo !== "N/A" ? memo : ""
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

  const handleGenerateQr = async () => {
    if (!verifyUri || error) return;
    const zid = verify?.zId || profile?.id;
    if (!zid) return;
    setVerifyQrEnabled(true);
    startPolling(zid);
  };

  return (
    <>
      <div className="bg-transparent border-none shadow-none p-0 mt-1">


        {/* Header */}
        <div className="text-left mb-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">

            <span>
              Send from {" "}
              <span
                className="text-blue-600 cursor-pointer"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                {cachedProfiles.find((p) => p.address === selectedAddress)
                  ?.name || "Your profile"}
              </span>
            </span>

            {/* removed amount requirement + help from header */}
          </h3>
        </div>

        {/* Memo Display */}
        <div className="relative group w-full mb-1">
          <pre
            className="
            w-full
            border border-[#000000]/90
            rounded-xl
            px-3 py-2
            text-[14px]
            bg-transparent
            text-gray-800
            font-mono
            whitespace-pre-wrap break-words text-left
            cursor-not-allowed select-none
            transition-shadow duration-200
          "
            style={{ minHeight: "6rem", lineHeight: "1.35" }}
          >
            <span className="block -mx-3 -mt-2 mb-2 px-3 py-2 bg-gray-800 border-b border-black/30 rounded-t-xl text-center">
              <span className="block text-[12px] text-gray-200">
                {explainerText}
              </span>
            </span>
            <span className="block mt-2 text-[14px] text-gray-800">
              {memo || "(waiting for edits)"}
            </span>
          </pre>
        </div>

        {/* Amount + Wallet */}
        <div className="mt-3 w-full">
          <AmountAndWallet
            amount={amount}
            setAmount={setVerifyAmount}
            openWallet={handleGenerateQr}
            openWalletLabel="Generate QR"
          />
          {!validAmount && (
            <span className="text-xs text-red-600">{error}</span>
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
                  <span key={step.key}>
                    <span
                      className={
                        progressState.currentIndex === idx
                          ? "font-bold text-blue-700"
                          : ""
                      }
                    >
                      {idx < progressState.doneCount && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="inline-block h-3.5 w-3.5 text-green-600 drop-shadow-xs mr-1 align-[-1px]"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
                        </svg>
                      )}
                      {progressState.currentIndex === idx ? "Now: " : ""}
                      {step.label}
                    </span>
                    {idx < progressSteps.length - 1 ? " > " : ""}
                  </span>
                ))}
              </div>
              {showOtpPhaseLine && (
                <div className="mt-1 text-xs text-gray-500 text-center">
                  {otpPhaseSteps.map((step, idx) => (
                    <span key={step.phase}>
                      <span
                        className={
                          step.isCurrent ? "font-bold text-blue-700" : ""
                        }
                      >
                        {step.showGreenCheck && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="inline-block h-3.5 w-3.5 text-green-600 drop-shadow-xs mr-1 align-[-1px]"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
                          </svg>
                        )}
                        {!step.showGreenCheck && step.isCurrent && step.failed && (
                          <span className="text-red-600 mr-1">X</span>
                        )}
                        {step.isCurrent ? "Now: " : ""}
                        {step.phase}
                      </span>
                      {idx < otpPhaseSteps.length - 1 ? " > " : ""}
                    </span>
                  ))}
                </div>
              )}
              {(pollOtpPhase || "").toLowerCase() === "sent" && (
                <div className="mt-2 text-xs text-green-700 text-center font-semibold">
                  OTP sent, check your wallet for your one-time passcode
                </div>
              )}
              {verifyQrEnabled && (
                <div className="mt-1 text-xs text-gray-500 text-center italic">
                  {progressExplainer}
                </div>
              )}
              {(pollOtpPhase || "").toLowerCase() === "sent" && !otpInlineSuccess && (
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
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pollDebug);
                    } catch (err) {
                      console.error("copy poll debug failed", err);
                    }
                  }}
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
