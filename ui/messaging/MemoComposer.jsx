import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFeedback, useFeedbackController } from "@/ui/messaging/useFeedback";
import useEmojiAutocomplete from "@/ui/messaging/useEmojiAutocomplete";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import HelpMessage from "@/ui/verification/HelpMessage";
import { useSwapContext } from "@/ui/swap/useSwapContext";

import QrUriBlock from "@/ui/verification/QrUriBlock";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
import CopyButton from "@/ui/profile/CopyButton";
import bookOpen from "@/ui/assets/book-open.svg";
import bookClosed from "@/ui/assets/book-closed.svg";
import { normalizeSlug, buildSlug } from "@/lib/profile/profileUtils";

function MemoCounter({ text }) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const over = bytes > 512;
  const diff = over ? bytes - 512 : 512 - bytes;

  return (
    <span className={`absolute bottom-3 right-3 text-md ${over ? "text-red-600" : "text-gray-400"}`}>
      {over ? `Over by ${diff} bytes` : `${diff} bytes left`}
    </span>
  );
}

export default function MemoComposer({ profile }) {
  const router = useRouter();
  const { forceShowQR } = useFeedback();
  const { uri, memo, amount, openWallet, setDraftMemo, setDraftAmount } =
    useFeedbackController(profile?.address);

  // Swap context
  const {
    tokenOptions,
    originTokenId,
    zecTokenId,
    originSymbol,
    refundAddress,
    slippageTolerance,
    quoteData,
    quotePreview,
    quoteStatus,
    depositUri,
    swapStatus,
    isConfirming,
    isGettingQuote,
    swapError,
    isSwapMode,
    setToken,
    setRefundAddress,
    setSlippageTolerance,
    getQuote,
    confirmSwap,
    cancelSwapMode,
  } = useSwapContext();

  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef(null);

  // Get current token's blockchain for refund address label
  const currentTokenBlockchain = useMemo(() => {
    const token = tokenOptions.find(
      (t) => (t.id || t.assetId) === originTokenId
    );
    return token?.blockchain || "";
  }, [tokenOptions, originTokenId]);

  // Get quote handler
  const handleGetQuote = useCallback(async () => {
    if (!isSwapMode) return;
    try {
      await getQuote({
        amount,
        destAddress: profile?.address,
        fromToken: originTokenId,
        toToken: zecTokenId,
        refund: refundAddress,
        slippage: slippageTolerance,
      });
    } catch (error) {
      // Error already handled in getQuote
    }
  }, [isSwapMode, amount, profile?.address, originTokenId, zecTokenId, refundAddress, slippageTolerance, getQuote]);

  // Confirm quote handler
  const handleConfirmQuote = useCallback(async () => {
    if (!isSwapMode || !quotePreview) return;
    try {
      await confirmSwap({
        amount,
        destAddress: profile?.address,
        fromToken: originTokenId,
        toToken: zecTokenId,
        refund: refundAddress,
        slippage: slippageTolerance,
      });
    } catch (error) {
      // Error already handled in confirmSwap
    }
  }, [isSwapMode, quotePreview, amount, profile?.address, originTokenId, zecTokenId, refundAddress, slippageTolerance, confirmSwap]);

  const handleSelect = (profile) => {
    if (!profile) return;
    if (typeof window !== "undefined") {
      window.lastSelectionWasExplicit = true;
    }
    const slug = buildSlug(profile);
    if (slug) router.push(`/${slug}`);
    setSearch("");
    setShowList(false);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [memo]);

  // Memo disabled: transparent addresses OR swap mode
  const disabled = profile?.address?.startsWith("t") || isSwapMode;

  const recipientName =
    profile?.display_name || profile?.name || "Recipient";

useEffect(() => {
  if (!forceShowQR) return;
  setTimeout(() => {
    const el = document.getElementById("zcash-feedback");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 300);
}, [forceShowQR]);

  const emoji = useEmojiAutocomplete({
    textareaRef,
    value: memo,
    setValue: setDraftMemo,
    enabled: !disabled,
  });

  return (
    <div className="bg-transparent border-none shadow-none p-0 -mt-4 relative z-10">

      {/* HEADER ROW: Recipient + Search + Help */}
      <div className="flex justify-between items-start relative mb-3">

        {/* Left side */}
        <div className="text-md font-semibold text-gray-800 whitespace-normal pt-2">
          Send to {" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {recipientName}
          </span>
        </div>

        {/* Right side search bar */}
{/* Right side: Help + Search */}
<div className="flex items-center gap-3 ml-3">



  {/* Search wrapper */}
  <div className="relative flex-1 flex justify-end">


          {!isFocused && (
            <img
              src={bookClosed}
              alt=""
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-80 invert sepia saturate-[5000%] hue-rotate-190 brightness-90"
            />
          )}

          {isFocused && (
            <img
              src={bookOpen}
              alt=""
              onClick={() => {
                setIsFocused(false);
                setSearch("");
                setShowList(false);
              }}
              className="cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-80 invert sepia saturate-[5000%] hue-rotate-190 brightness-90"
            />
          )}

          {/* search input */}
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowList(true);
            }}
            onFocus={() => {
              setShowList(true);
              setIsFocused(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsFocused(false);
                setSearch("");
                setShowList(false);
              }, 150);
            }}
            placeholder={isFocused ? "name" : ""}
            className={`h-10 border rounded-xl transition-all duration-150 w-10 focus:w-[100%] text-gray-700 text-center ${
              isFocused
                ? "px-3 text-base placeholder:text-gray-400"
                : "text-xl placeholder:text-black"
            }`}
          />

          {showList && search && (
            <div className="absolute top-full left-0 z-50 w-full mt-1">
              <ProfileSearchDropdown
                listOnly={true}
                value={search}
                onChange={(v) => {
                  if (typeof v === "object") {
                    handleSelect(v);
                  } else {
                    setSearch(v);
                  }
                }}
                placeholder="name or addr"
              />
            </div>
          )}
        </div>
      </div>

      </div>

      {/* MEMO FIELD */}
      <div className="relative mb-2">
        {!disabled && (
          <div className="absolute left-3 top-2 pointer-events-none text-gray-500 text-md">
            ✎
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={3}
          value={memo}
          disabled={disabled}
          onChange={(e) => {
            const el = e.target;
            setDraftMemo(el.value);
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
            emoji.update();
          }}
          onBlur={emoji.close}
          placeholder={
            disabled
              ? isSwapMode
                ? "Messaging is available only while sending ZEC"
                : "Memos are not supported for transparent addresses"
              : `Write your message to ${recipientName} here...`
          }
          className={`border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none pr-7 text-gray-700 ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "focus:ring-1 focus:ring-blue-500 pl-8"
          }`}
        />

        {emoji.results.length > 0 && !disabled && (
          <div className="absolute top-full left-0 mt-1 z-50 w-[240px] rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto">
            {emoji.results.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50" onMouseDown={(e) => { e.preventDefault(); emoji.insert(item); }}>
                <span className="text-lg">{item.ch}</span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {memo && !disabled && (
          <button
            onClick={() => setDraftMemo("")}
            className="absolute right-3 top-1 text-gray-400 hover:text-gray-600"
          >
            ⌫
          </button>
        )}

        <MemoCounter text={memo} />
      </div>

      {/* AMOUNT + WALLET */}
      <AmountAndWallet
        amount={amount}
        setAmount={setDraftAmount}
        openWallet={openWallet}
        showOpenWallet={false}
        showUsdPill
        showRateMessage
        asset={originSymbol}
        assetOptions={tokenOptions.map((token) => ({
          id: token.id || token.assetId || token.tokenId || token.asset,
          symbol: token.symbol || token.ticker || "",
          label: `${token.symbol || token.ticker || ""} - ${token.blockchain || ""}`,
          logo: token.logo || null,
          chain: token.blockchain || "",
          decimals: token.decimals || 8,
        }))}
        setAsset={(tokenId) => setToken(tokenId)}
        showRefund={isSwapMode}
        refundAddress={refundAddress}
        setRefundAddress={setRefundAddress}
        tokenBlockchain={currentTokenBlockchain}
      />

      {/* Swap Settings (Swap Mode Only) */}
      {isSwapMode && (
        <div className="mb-4 p-3 rounded-lg border border-gray-800 overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
          {/* Slippage Tolerance */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slippage (%)
          </label>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {["0.1", "0.5", "1", "2"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSlippageTolerance(value)}
                  className={`px-3 py-1 text-sm border border-gray-800 rounded-lg transition-colors whitespace-nowrap ${
                    slippageTolerance === value
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={slippageTolerance}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                    setSlippageTolerance(val);
                  }
                }}
                className="w-20 border border-gray-800 px-3 py-1 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </div>

          {/* Get Quote / Confirm Quote Buttons */}
          <div className="flex flex-col min-[480px]:flex-row gap-3">
            <button
              type="button"
              onClick={handleGetQuote}
              disabled={isGettingQuote || !amount || !refundAddress || parseFloat(amount) <= 0}
              className={`w-full min-[480px]:w-1/2 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
                isGettingQuote || !amount || !refundAddress || parseFloat(amount) <= 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              {isGettingQuote ? "Getting quote..." : "Get quote"}
            </button>
            <button
              type="button"
              onClick={handleConfirmQuote}
              disabled={!quotePreview || isConfirming}
              className={`w-full min-[480px]:w-1/2 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
                !quotePreview || isConfirming
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              {isConfirming ? "Confirming..." : "Confirm quote"}
            </button>
          </div>
        </div>
      )}

      {/* Divider line like Verify */}
      <div className="border-t border-gray-300 my-4"></div>

      <HelpMessage />

      {/* Swap Status Display */}
      {isSwapMode && (quoteStatus || swapError) && (
        <div className={`mb-4 p-3 rounded-lg border ${
          swapError
            ? "bg-red-50 border-red-200"
            : swapStatus === "SUCCESS"
            ? "bg-green-50 border-green-200"
            : swapStatus === "FAILED" || swapStatus === "REFUNDED"
            ? "bg-yellow-50 border-yellow-200"
            : "bg-blue-50 border-blue-200"
        }`}>
          <div className={`text-sm ${
            swapError
              ? "text-red-700"
              : swapStatus === "SUCCESS"
              ? "text-green-700"
              : swapStatus === "FAILED" || swapStatus === "REFUNDED"
              ? "text-yellow-700"
              : "text-blue-700"
          }`}>
            {swapError || quoteStatus}
            {isConfirming && (
              <span className="ml-2 inline-block animate-spin">⏳</span>
            )}
          </div>
        </div>
      )}

      {/* Cancel Swap Button */}
      {isSwapMode && !isConfirming && (
        <button
          onClick={cancelSwapMode}
          className="mb-3 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to ZEC payment
        </button>
      )}

      {/* QR / URI BLOCK */}
      <div className="-mt-4">
        <QrUriBlock
          uri={isSwapMode && depositUri ? depositUri : uri}
          profileName={
            profile?.display_name ||
            profile?.name ||
            "recipient"
          }
          forceShowQR={forceShowQR}
        />

        {/* Recipient ZEC Address Display (Swap Mode) */}
        {isSwapMode && depositUri && profile?.address && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 mb-2 font-medium">
              Recipient will receive ZEC at:
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono flex-1 break-all text-gray-800">
                {profile.address}
              </code>
              <CopyButton text={profile.address} />
            </div>
            <div className="text-xs text-gray-500 mt-2 italic">
              After you send {originSymbol} to the address above, it will be automatically swapped to ZEC and delivered to this address.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
