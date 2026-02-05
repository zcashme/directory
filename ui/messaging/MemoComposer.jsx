import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useFeedback, useFeedbackController } from "@/ui/messaging/useFeedback";
import useEmojiAutocomplete from "@/ui/messaging/useEmojiAutocomplete";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import HelpMessage from "@/ui/verification/HelpMessage";
import { useDebounce } from "use-debounce";

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

  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Token selection state (for swap mode)
  const [tokenOptions, setTokenOptions] = useState([]);
  const [originTokenId, setOriginTokenId] = useState(null);
  const [zecTokenId, setZecTokenId] = useState(null);
  const [originSymbol, setOriginSymbol] = useState("ZEC");
  const [refundAddress, setRefundAddress] = useState("");
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Swap workflow state
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [quoteData, setQuoteData] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("");
  const [depositUri, setDepositUri] = useState("");
  const [statusKey, setStatusKey] = useState(null);
  const [swapStatus, setSwapStatus] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [swapError, setSwapError] = useState("");
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [quotePreview, setQuotePreview] = useState(null);

  const textareaRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Load tokens from API
  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const response = await fetch("/api/swap/tokens");
      if (!response.ok) {
        throw new Error("Failed to load tokens");
      }
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Failed to load tokens");
      }

      // Extract tokens list from response
      const tokens = result.data?.tokens || result.data || [];

      // Filter to mainnet only (API uses 'blockchain' property, not 'chain')
      const mainnetTokens = tokens.filter(
        (token) =>
          token.blockchain &&
          !token.blockchain.toLowerCase().includes("testnet") &&
          !token.blockchain.toLowerCase().includes("test")
      );

      // Find ZEC token
      const zecToken = mainnetTokens.find(
        (token) =>
          (token.symbol || token.ticker || "").toUpperCase() === "ZEC" &&
          (token.blockchain || "").toLowerCase().includes("zec")
      );

      setTokenOptions(mainnetTokens);

      if (zecToken) {
        const zecId = zecToken.id || zecToken.assetId;
        setZecTokenId(zecId);
        // Set initial token to ZEC
        if (!originTokenId) {
          setOriginTokenId(zecId);
          setOriginSymbol(zecToken.symbol || zecToken.ticker || "ZEC");
        }
      }
    } catch (error) {
      console.error("Error loading tokens:", error);
      // On error, keep default ZEC mode
    } finally {
      setIsLoadingTokens(false);
    }
  }, [originTokenId]);

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Set token handler
  const setToken = useCallback((tokenId) => {
    const token = tokenOptions.find((t) => {
      const tId = t.id || t.assetId || t.tokenId || t.asset;
      return tId === tokenId;
    });
    if (token) {
      const finalTokenId = token.id || token.assetId || token.tokenId || token.asset || tokenId;
      setOriginTokenId(finalTokenId);
      setOriginSymbol(token.symbol || token.ticker || "ZEC");
    }
  }, [tokenOptions]);

  // Swap mode detection
  const isSwapMode = originTokenId !== null && zecTokenId !== null && originTokenId !== zecTokenId;

  // Stop status polling
  const stopStatusPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Poll swap status
  const startStatusPolling = useCallback((key) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const pollStatus = async () => {
      if (!key?.depositAddress) return;

      try {
        const params = new URLSearchParams({
          depositAddress: key.depositAddress,
        });
        if (key.depositMemo) {
          params.append("depositMemo", key.depositMemo);
        }

        const response = await fetch(`/api/swap/status?${params}`);
        const result = await response.json();

        if (result.ok && result.status) {
          // Handle different response structures:
          // - result.status.status (nested)
          // - result.status (direct status string)
          // - result.status.status field from API response
          const status = result.status?.status || result.status || null;
          
          if (status) {
            setSwapStatus(status);

            // Update status message
            switch (status.toUpperCase()) {
              case "PENDING":
                setQuoteStatus("Waiting for deposit...");
                break;
              case "SUCCESS":
                setQuoteStatus("Swap completed! ZEC delivered to recipient.");
                stopStatusPolling();
                break;
              case "FAILED":
                setQuoteStatus("Swap failed. Please contact support.");
                setSwapError("Swap failed");
                stopStatusPolling();
                break;
              case "REFUNDED":
                setQuoteStatus("Swap refunded to your address.");
                stopStatusPolling();
                break;
              default:
                setQuoteStatus(`Status: ${status}`);
            }
          }
        } else if (result.ok === false && result.error) {
          // Handle API errors gracefully
          console.error("Swap status error:", result.error);
          // Don't stop polling on retryable errors
          if (!result.retryable) {
            setSwapError(result.error);
            stopStatusPolling();
          }
        }
      } catch (error) {
        console.error("Error polling swap status:", error);
      }
    };

    // Poll immediately, then every 6 seconds
    pollStatus();
    pollIntervalRef.current = setInterval(pollStatus, 6000);
  }, [stopStatusPolling]);

  // Get quote function
  const handleGetQuote = useCallback(async () => {
    if (!isSwapMode) return;

    setIsGettingQuote(true);
    setSwapError("");
    setQuoteStatus("Getting quote...");

    try {
      const response = await fetch("/api/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: originTokenId,
          toToken: zecTokenId,
          amountIn: amount,
          destAddress: profile?.address,
          refundAddress: refundAddress,
          slippageTolerance: slippageTolerance,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to get quote");
      }

      setQuotePreview(result.display);
      setQuoteData(result);
      setQuoteStatus("Quote ready");
    } catch (error) {
      console.error("Error getting quote:", error);
      setSwapError(error.message || "Failed to get quote");
      setQuoteStatus("");
    } finally {
      setIsGettingQuote(false);
    }
  }, [isSwapMode, amount, profile?.address, refundAddress, originTokenId, zecTokenId, slippageTolerance]);

  // Confirm quote function
  const handleConfirmQuote = useCallback(async () => {
    if (!isSwapMode || !quotePreview) return;

    setIsConfirming(true);
    setSwapError("");
    setQuoteStatus("Confirming swap...");

    try {
      const response = await fetch("/api/swap/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: originTokenId,
          toToken: zecTokenId,
          amountIn: amount,
          destAddress: profile?.address,
          refundAddress: refundAddress,
          slippageTolerance: slippageTolerance,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to confirm swap");
      }

      // Store deposit URI and status key
      setDepositUri(result.paymentUri || result.deposit?.address || "");
      setStatusKey(result.statusKey);
      setQuoteData(result);
      setQuoteStatus("Swap confirmed! Waiting for deposit...");
      setSwapStatus("PENDING");

      // Start polling for status
      if (result.statusKey) {
        startStatusPolling(result.statusKey);
      }
    } catch (error) {
      console.error("Error confirming swap:", error);
      setSwapError(error.message || "Failed to confirm swap");
      setQuoteStatus("");
    } finally {
      setIsConfirming(false);
    }
  }, [isSwapMode, quotePreview, amount, profile?.address, refundAddress, originTokenId, zecTokenId, slippageTolerance, startStatusPolling]);

  // Auto-confirm function (kept for backward compatibility, but disabled in favor of manual flow)
  const handleAutoConfirm = useCallback(async () => {
    if (!isSwapMode) return;

    setIsConfirming(true);
    setSwapError("");
    setQuoteStatus("Confirming swap...");

    try {
      const response = await fetch("/api/swap/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: originTokenId,
          toToken: zecTokenId,
          amountIn: amount,
          destAddress: profile?.address,
          refundAddress: refundAddress,
          slippageTolerance: slippageTolerance,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to confirm swap");
      }

      // Store deposit URI and status key
      setDepositUri(result.paymentUri || result.deposit?.address || "");
      setStatusKey(result.statusKey);
      setQuoteData(result);
      setQuoteStatus("Swap confirmed! Waiting for deposit...");
      setSwapStatus("PENDING");

      // Start polling for status
      if (result.statusKey) {
        startStatusPolling(result.statusKey);
      }
    } catch (error) {
      console.error("Error confirming swap:", error);
      setSwapError(error.message || "Failed to confirm swap");
      setQuoteStatus("");
    } finally {
      setIsConfirming(false);
    }
  }, [isSwapMode, amount, profile?.address, refundAddress, originTokenId, zecTokenId, slippageTolerance, startStatusPolling]);

  // Disable auto-confirm - using manual "Get quote" / "Confirm quote" flow instead
  // const [debouncedAmount] = useDebounce(amount, 800);
  // const [debouncedRefundAddress] = useDebounce(refundAddress, 800);

  // useEffect(() => {
  //   // Only auto-confirm in swap mode with all required fields
  //   if (!isSwapMode) return;
  //   if (!debouncedAmount || parseFloat(debouncedAmount) <= 0) return;
  //   if (!profile?.address) return;
  //   if (!debouncedRefundAddress) return;
  //   if (!originTokenId || !zecTokenId) return;

  //   handleAutoConfirm();
  // }, [debouncedAmount, originTokenId, profile?.address, debouncedRefundAddress, isSwapMode, handleAutoConfirm]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  // Cancel swap mode
  const cancelSwapMode = () => {
    setOriginTokenId(zecTokenId);
    setOriginSymbol("ZEC");
    setRefundAddress("");
    setQuoteData(null);
    setQuotePreview(null);
    setQuoteStatus("");
    setDepositUri("");
    setStatusKey(null);
    setSwapStatus("");
    setSwapError("");
    stopStatusPolling();
  };

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
    <div className="bg-transparent border-none shadow-none p-0 -mt-4">

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
            emoji.handleInput(el.value);
          }}
          onKeyDown={emoji.handleKeyDown}
          onKeyUp={() => emoji.handleInput()}
          onClick={() => emoji.handleClick()}
          onBlur={emoji.handleBlur}
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

        {emoji.isOpen && !disabled && (
          <div
            ref={emoji.floatingRef}
            className="z-50 w-[360px] max-w-[calc(100%-16px)] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
            style={emoji.floatingStyles}
            role="listbox"
            aria-label="Emoji suggestions"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
              <div className="truncate">
                {emoji.query ? `Searching: :${emoji.query}` : "Type to search..."}
              </div>
              <span className="text-[10px] border border-gray-200 px-2 py-0.5 rounded-full">
                : search
              </span>
            </div>
            <div className="max-h-64 overflow-auto">
              {emoji.results.map((item, idx) => {
                const shortcodes = (item.shortcodes || []).slice(0, 3);
                return (
                  <div
                    key={`${item.ch}-${idx}`}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 ${
                      idx === emoji.activeIndex
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    role="option"
                    aria-selected={idx === emoji.activeIndex}
                    onMouseEnter={() => emoji.setActiveIndex(idx)}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      emoji.insertAtIndex(idx);
                    }}
                  >
                    <div className="text-lg" aria-hidden="true">
                      {item.ch}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-800 truncate">
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {(shortcodes.length
                          ? shortcodes.map((s) => `:${s}:`).join(" ")
                          : ":emoji:")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
        setAsset={setToken}
        showRefund={isSwapMode}
        refundAddress={refundAddress}
        setRefundAddress={setRefundAddress}
      />

      {/* Swap Settings (Swap Mode Only) */}
      {isSwapMode && (
        <div className="mb-4 p-3 rounded-lg border border-black" style={{ backgroundColor: 'var(--color-background)' }}>
          {/* Slippage Tolerance */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slippage (%)
            </label>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {["0.1", "0.5", "1", "2", "5"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSlippageTolerance(value)}
                    className={`px-3 py-1 text-sm border border-black rounded-lg transition-colors ${
                      slippageTolerance === value
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
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
                  className="w-20 border border-black px-3 py-1 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>
          </div>

          {/* Get Quote / Confirm Quote Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleGetQuote}
              disabled={isGettingQuote || !amount || !refundAddress || parseFloat(amount) <= 0}
              className={`flex-1 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
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
              className={`flex-1 px-4 py-2 text-sm font-medium border border-black rounded-lg transition-colors ${
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
