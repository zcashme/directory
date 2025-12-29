import React, { useEffect, useMemo, useState } from "react";
import QrUriBlock from "../components/QrUriBlock";
import AmountAndWallet from "../components/AmountAndWallet.jsx";

import useFeedbackController from "../hooks/useFeedbackController";
import { useFeedback } from "../hooks/useFeedback";
import SubmitOtp from "../SubmitOtp.jsx";
import { buildZcashUri } from "../utils/zcashWalletUtils";
import { cachedProfiles } from "../hooks/useProfiles";

const SIGNIN_ADDR = 
  "u12p8lslmrnrfyjtx83lu5mllghvsyt8d7cnajrj7nls05rlk9dendhrznz7wzsulth2zktfy7ynpguj53gehdgakmj0sjayud3kzl58wjx7lakm29r3t4a3qgq6elplxm5llxkdaws9t4uslvz42dycvg34n423k3s74dh0eeqx0825nzprrtrl6eaj3pmshtuj96wcq9cycy5x2ywq9";
const SIGNIN_ADDR_old =
  "u1qzt502u9fwh67s7an0e202c35mm0h534jaa648t4p2r6mhf30guxjjqwlkmvthahnz5myz2ev7neff5pmveh54xszv9njcmu5g2eent82ucpd3lwyzkmyrn6rytwsqefk475hl5tl4tu8yehc0z8w9fcf4zg6r03sq7lldx0uxph7c0lclnlc4qjwhu2v52dkvuntxr8tmpug3jntvm";

const MIN_SIGNIN_AMOUNT = 0.001;
const DEFAULT_SIGNIN_AMOUNT = (MIN_SIGNIN_AMOUNT * 3).toFixed(3);

export default function ZcashFeedbackVerify() {
  const { verifyMemo: memo, verifyAmount: amount, setVerifyAmount } =
    useFeedbackController();

  const { selectedAddress, pendingEdits } = useFeedback();
  const profile = cachedProfiles.find((p) => p.address === selectedAddress);

  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [showFooterHelp, setShowFooterHelp] = useState(false);

  const explainerText = useMemo(() => {
    const profileEdits = pendingEdits?.profile || {};
    const deleted = Array.isArray(profileEdits?.d) ? profileEdits.d : [];
    const changedFields = [];

    const hasField = (key, token) =>
      Boolean(profileEdits?.[key]) || deleted.includes(token);

    if (hasField("name", "n")) changedFields.push("name");
    if (hasField("bio", "b")) changedFields.push("bio");
    if (hasField("profile_image_url", "i"))
      changedFields.push("profile image");
    if (profileEdits?.c) changedFields.push("nearest city");

    const hasLinks =
      Array.isArray(pendingEdits?.l) && pendingEdits.l.length > 0;
    if (hasLinks) changedFields.push("links");

    if (hasField("address", "a")) changedFields.push("address");

    if (changedFields.length === 0) {
      return "Send to verify address. Waiting for edits to encode.";
    }

    const last = changedFields[changedFields.length - 1];
    const prefix = changedFields.slice(0, -1);
    const list =
      changedFields.length === 1
        ? last
        : changedFields.length === 2
          ? `${prefix[0]} and ${last}`
          : `${prefix.join(", ")}, and ${last}`;

    return `Encodes requested changes to ${list}.`;
  }, [pendingEdits]);

  useEffect(() => {
    const trimmed = (amount || "").trim();
    if (!trimmed || trimmed === "0") {
      setVerifyAmount(DEFAULT_SIGNIN_AMOUNT);
    }
  }, [amount, setVerifyAmount]);

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

  const handleOpen = () => {
    if (!verifyUri || error) return;
    window.open(verifyUri, "_blank");
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
            <span className="block text-[11px] text-gray-100 uppercase tracking-wide">
              Do not modify message before sending
            </span>
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
            openWallet={handleOpen}
          />
          {!validAmount && (
            <span className="text-xs text-red-600">{error}</span>
          )}
        </div>

        {showFooterHelp && (
          <p className="mx-1 mt-2 mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-snug">
            After sending this message, you will receive your OTP within 24-hours. <br></br>Then,
            {" "}
            <button
              type="button"
              onClick={() => setIsOtpOpen(true)}
              className="font-semibold text-blue-600 underline cursor-pointer"
            >
              submit your OTP
            </button>{" "}
            to verify changes.
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
          {verifyUri && !error && (
            <div className="-mt-2 flex justify-center">
              <QrUriBlock
                uri={verifyUri}
                profileName="verification"
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
