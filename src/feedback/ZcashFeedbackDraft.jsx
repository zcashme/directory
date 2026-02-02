"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "../hooks/useFeedback";
import useFeedbackController from "../hooks/useFeedbackController";
import useEmojiAutocomplete from "../hooks/useEmojiAutocomplete";
import AmountAndWallet from "../components/AmountAndWallet.jsx";
import HelpMessage from "../components/HelpMessage.jsx";
import { cachedProfiles } from "../hooks/useProfiles";
import QrUriBlock from "../components/QrUriBlock";
import ProfileSearchDropdown from "../components/ProfileSearchDropdown";
import bookOpen from "../assets/book-open.svg";
import bookClosed from "../assets/book-closed.svg";

const normalizeSlug = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

const buildSlug = (profile) => {
  if (!profile?.name) return "";
  const base = normalizeSlug(profile.name);
  if (!base) return "";
  if (profile.slug) return profile.slug;
  return profile.address_verified ? base : `${base}-${profile.id}`;
};

function MemoCounter({ text }) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const over = bytes > 512;
  const diff = over ? bytes - 512 : 512 - bytes;

  return (
    <span
      className={`absolute bottom-3 right-3 text-md ${
        over ? "text-red-600" : "text-gray-400"
      }`}
    >
      {over ? `Over by ${diff} bytes` : `${diff} bytes left`}
    </span>
  );
}

export default function ZcashFeedbackDraft() {
  const router = useRouter();
  const { selectedAddress, forceShowQR } = useFeedback();
  const { uri, memo, amount, openWallet, setDraftMemo, setDraftAmount } =
    useFeedbackController();

  // ----------------------------
  // Swap state
  // ----------------------------
  const [tokenOptions, setTokenOptions] = useState([]); // [{id,symbol,label,logo?}]
  const [originTokenId, setOriginTokenId] = useState(null);
  const [originSymbol, setOriginSymbol] = useState("ZEC");
  const [zecTokenId, setZecTokenId] = useState(null);

  const [refundAddress, setRefundAddress] = useState("");

  const [depositUri, setDepositUri] = useState("");
  const [statusKey, setStatusKey] = useState(null); // {depositAddress, depositMemo}
  const [swapStatus, setSwapStatus] = useState("");

  // quote + slippage
  const [slippageTolerance, setSlippageTolerance] = useState("0.5"); // percent as string
  const [quoteData, setQuoteData] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState(""); // UI-only status text
  const [isQuoting, setIsQuoting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const isZecMode = !!originTokenId && !!zecTokenId && originTokenId === zecTokenId;
  const isSwapMode = !!originTokenId && !!zecTokenId && originTokenId !== zecTokenId;

  const refundLabel = useMemo(() => {
    if (!originSymbol) return "Your refund address";
    return `Your ${originSymbol} refund address (in case swap fails)`;
  }, [originSymbol]);

  // Load tokens once
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch("/api/swap/tokens");
        const j = await r.json();
        if (!alive) return;
        if (!j.ok) return;

        const list =
          j.data?.tokens || j.data?.data || (Array.isArray(j.data) ? j.data : []);
        if (!Array.isArray(list) || list.length === 0) return;

        const opts = list
          .map((t) => {
            const id = t.id || t.tokenId || t.assetId || t.asset || t.symbol;
            const symbol = (t.symbol || t.ticker || id || "").toString().toUpperCase();
            const chain = t.chain || t.network || t.originChain || "?";
            const label = t.label || t.name || `${symbol} (${chain})`;
            const logo = t.logo || t.icon || t.image || null;
            return { id, symbol, label: `${label}`, logo };
          })
          .filter((x) => x.id && x.symbol);

        setTokenOptions(opts);

        // get ZEC token id
        const z = opts.find((x) => x.symbol === "ZEC");
        const zId = z?.id || null;
        setZecTokenId(zId);

        // Default origin should be ZEC so old flow is default
        if (zId) {
          setOriginTokenId(zId);
          setOriginSymbol("ZEC");
        } else {
          const first = opts[0];
          if (first) {
            setOriginTokenId(first.id);
            setOriginSymbol(first.symbol);
          }
        }
      } catch {
        // swallow errors
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Helper: clear swap artifacts
  const clearSwapArtifacts = useCallback(() => {
    setDepositUri("");
    setStatusKey(null);
    setSwapStatus("");
  }, []);

  const clearQuote = useCallback(() => {
    setQuoteData(null);
    setQuoteStatus("");
  }, []);

  // If user switches to ZEC mode, clear swap artifacts/quote so old flow shows
  useEffect(() => {
    if (!isZecMode) return;
    clearSwapArtifacts();
    clearQuote();
  }, [isZecMode, clearSwapArtifacts, clearQuote]);

  // When swap inputs change, clear quote + deposit info (so user must re-quote)
  useEffect(() => {
    if (!isSwapMode) return;
    clearSwapArtifacts();
    clearQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSwapMode, originTokenId, zecTokenId, amount, refundAddress, slippageTolerance, selectedAddress]);

  // ----------------------------
  // Poll status ONLY in swap mode (after confirm)
  // ----------------------------
  useEffect(() => {
    if (!isSwapMode) return;
    if (!statusKey?.depositAddress) return;

    let alive = true;
    const stop = new Set(["SUCCESS", "FAILED", "REFUNDED"]);

    (async () => {
      while (alive) {
        try {
          const qs = new URLSearchParams({
            depositAddress: statusKey.depositAddress,
            ...(statusKey.depositMemo ? { depositMemo: statusKey.depositMemo } : {}),
          });

          const r = await fetch(`/api/swap/status?${qs.toString()}`);
          const j = await r.json();

          const s =
            j?.status?.status ||
            j?.status?.data?.status ||
            j?.status?.quote?.status ||
            j?.status?.data?.quote?.status;

          if (s) setSwapStatus(s);
          if (s && stop.has(s)) return;
        } catch {
          // ignore transient
        }

        await new Promise((res) => setTimeout(res, 6000));
      }
    })();

    return () => {
      alive = false;
    };
  }, [isSwapMode, statusKey?.depositAddress, statusKey?.depositMemo]);

  // ----------------------------
  // Existing UI behavior
  // ----------------------------
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef(null);
  const memoWrapRef = useRef(null);
  const qrBlockRef = useRef(null);

  useEffect(() => {
    if (!isSwapMode) return;
    if (!depositUri) return;
    qrBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isSwapMode, depositUri]);

  const handleSelect = (profile) => {
    if (!profile) return;
    if (typeof window !== "undefined") window.lastSelectionWasExplicit = true;
    const slug = buildSlug(profile);
    if (slug) router.push(`/${slug}`);
    setSearch("");
    setShowList(false);
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [memo]);

  // Disable memo if swap mode OR t-address
  const memoDisabled = selectedAddress?.startsWith("t") || isSwapMode;

  const safeProfiles = Array.isArray(cachedProfiles) ? cachedProfiles : [];
  const recipientProfile = safeProfiles.find((p) => p.address === selectedAddress);
  const recipientName =
    recipientProfile?.display_name || recipientProfile?.name || "Recipient";

  useEffect(() => {
    if (!forceShowQR) return;
    setTimeout(() => {
      const el = document.getElementById("zcash-feedback");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [forceShowQR]);

  // ✅ KEEP emoji autocomplete enabled in ZEC mode so :pray: (and others) work
  const emoji = useEmojiAutocomplete({
    textareaRef,
    containerRef: memoWrapRef,
    value: memo,
    setValue: setDraftMemo,
    enabled: !memoDisabled,
  });

  // ZEC mode uses original uri (no swap override)
  const activeQrUri = isSwapMode ? (depositUri || "") : uri;

  // cancel swap -> revert to ZEC
  const cancelSwapToZec = () => {
    const z =
      tokenOptions.find((x) => x.id === zecTokenId) ||
      tokenOptions.find((x) => x.symbol === "ZEC");
    if (!z) return;
    setOriginTokenId(z.id);
    setOriginSymbol("ZEC");
    clearSwapArtifacts();
    clearQuote();
  };

  // ----------------------------
  // Quote + Confirm handlers
  // ----------------------------
  const getSwapAmount = () => {
    const amt = String(amount || "").trim();
    const n = Number(amt);
    if (!amt || !Number.isFinite(n) || n <= 0) return null;
    return amt;
  };

  const getSlippage = () => {
    const raw = String(slippageTolerance || "").trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return String(Math.min(Math.max(n, 0), 50));
  };

  const handleGetQuote = async () => {
    if (!isSwapMode) return;
    if (!selectedAddress) return;

    const amt = getSwapAmount();
    if (!amt) {
      setQuoteStatus("Enter a valid amount first.");
      return;
    }

    if (!refundAddress) {
      setQuoteStatus("Enter your refund address first.");
      return;
    }

    const slip = getSlippage();
    if (slip === null) {
      setQuoteStatus("Enter a valid slippage tolerance.");
      return;
    }

    try {
      setIsQuoting(true);
      setQuoteStatus("GETTING_QUOTE");
      setQuoteData(null);

      const body = {
        fromToken: originTokenId,
        toToken: zecTokenId,
        amountIn: amt,
        slippageTolerance: slip,
        destAddress: selectedAddress,
        refundAddress,
      };

      const r = await fetch("/api/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await r.json();

      if (!j.ok) {
        setQuoteStatus(`ERROR: ${j.error || "Quote failed"}`);
        setQuoteData(null);
        return;
      }

      setQuoteData({
        quoteId: j.quoteId || null,
        display: j.display || null,
        raw: j.quote || null,
        requestDebug: j.requestDebug || null,
      });

      setQuoteStatus("QUOTE_READY");
    } catch (e) {
      setQuoteStatus(`ERROR: ${String(e?.message || e)}`);
      setQuoteData(null);
    } finally {
      setIsQuoting(false);
    }
  };

  const handleConfirmQuote = async () => {
    if (!isSwapMode) return;
    if (!selectedAddress) return;

    const amt = getSwapAmount();
    if (!amt) {
      setSwapStatus("Enter a valid amount first.");
      return;
    }

    if (!refundAddress) {
      setSwapStatus("ENTER_REFUND_ADDRESS");
      return;
    }

    const slip = getSlippage();
    if (slip === null) {
      setSwapStatus("INVALID_SLIPPAGE");
      return;
    }

    try {
      setIsConfirming(true);
      setSwapStatus("CREATING_SWAP");

      const body = {
        fromToken: originTokenId,
        toToken: zecTokenId,
        amountIn: amt,
        destAddress: selectedAddress,
        refundAddress,
        slippageTolerance: slip,
        quoteId: quoteData?.quoteId,
      };

      const r = await fetch("/api/swap/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await r.json();

      if (!j.ok) {
        setSwapStatus(`ERROR: ${j.error || "Confirm failed"}`);
        setDepositUri("");
        setStatusKey(null);
        return;
      }

      // keep fallbacks so QR always appears
      const nextUri = j?.paymentUri || j?.deposit?.address || "";

      setDepositUri(nextUri);
      setStatusKey(j.statusKey || null);
      setSwapStatus("AWAITING_DEPOSIT");
    } catch (e) {
      setSwapStatus(`ERROR: ${String(e?.message || e)}`);
      setDepositUri("");
      setStatusKey(null);
    } finally {
      setIsConfirming(false);
    }
  };

  const slippagePresets = ["0.1", "0.5", "1", "2", "5"];

  return (
    <div className="bg-transparent border-none shadow-none p-0 -mt-4">
      {/* HEADER ROW: Recipient + Search */}
      <div className="flex justify-between items-start relative mb-3">
        <div className="text-md font-semibold text-gray-800 whitespace-normal pt-2">
          Send to{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {recipientName}
          </span>
        </div>

        <div className="flex items-center gap-3 ml-3">
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
                    if (typeof v === "object") handleSelect(v);
                    else setSearch(v);
                  }}
                  profiles={safeProfiles}
                  placeholder="name or addr"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swap status line only in swap mode */}
      {isSwapMode && swapStatus ? (
        <div className="text-xs text-gray-500 mb-2">
          Swap: <span className="font-semibold">{swapStatus}</span>
        </div>
      ) : null}

      {/* MEMO FIELD */}
      <div ref={memoWrapRef} className="relative mb-2 z-[9999] isolate">
        {!memoDisabled && (
          <div className="absolute left-3 top-2 pointer-events-none text-gray-500 text-md">
            ✎
          </div>
        )}

        {/* Cancel icon shown only in swap mode */}
        {isSwapMode && (
          <button
            type="button"
            onClick={cancelSwapToZec}
            className="absolute right-3 top-2 text-gray-400 hover:text-gray-700"
            title="Cancel swap and go back to ZEC"
            aria-label="Cancel swap"
          >
            ✕
          </button>
        )}

        <textarea
          ref={textareaRef}
          rows={3}
          value={memo}
          disabled={memoDisabled}
          onChange={(e) => {
            const el = e.target;
            setDraftMemo(el.value);
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
            if (!memoDisabled) emoji.handleInput(el.value);
          }}
          onKeyDown={(e) => {
            if (!memoDisabled) emoji.handleKeyDown(e);
          }}
          onKeyUp={() => {
            if (!memoDisabled) emoji.handleInput();
          }}
          onClick={() => {
            if (!memoDisabled) emoji.handleClick();
          }}
          onBlur={(e) => {
            if (!memoDisabled) emoji.handleBlur(e);
          }}
          placeholder={
            memoDisabled
              ? isSwapMode
                ? "Message is available only when sending ZEC"
                : "Memos are not supported for transparent addresses"
              : `Write your message to ${recipientName} here...`
          }
          className={`border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none pr-7 text-gray-700 ${
            memoDisabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "focus:ring-1 focus:ring-blue-500 pl-8"
          }`}
        />

        {/* ✅ Emoji autocomplete dropdown (keeps :pray: workflow) */}
        {emoji.isOpen && !memoDisabled && (
           <div
              className="absolute z-[9999] w-[360px] max-w-[calc(100%-16px)] rounded-xl border border-gray-200 bg-white opacity-100 shadow-xl overflow-hidden"
              style={{ left: emoji.position.left, top: emoji.position.top }}
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
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 bg-white ${
                      idx === emoji.activeIndex ? "bg-blue-100" : "hover:bg-gray-50"
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
                        {shortcodes.length
                          ? shortcodes.map((s) => `:${s}:`).join(" ")
                          : ":emoji:"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {memo && !memoDisabled && (
          <button
            type="button"
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
        asset={originSymbol || "…"}
        assetOptions={tokenOptions}
        setAsset={(tokenId) => {
          const picked = tokenOptions.find((x) => x.id === tokenId);
          if (!picked) return;

          setOriginTokenId(picked.id);
          setOriginSymbol(picked.symbol);

          clearSwapArtifacts();
          clearQuote();

          if (picked.symbol !== "ZEC") setRefundAddress("");
        }}
        showRefund={isSwapMode}
        refundLabel={refundLabel}
        refundAddress={refundAddress}
        setRefundAddress={setRefundAddress}
        refundPlaceholder={`Paste your ${originSymbol || ""} address`}
      />

      {/* Slippage + Quote/Confirm UI */}
      {isSwapMode && (
        <div className="mt-3 border border-gray-200 rounded-xl p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-800">Swap settings</div>
            {quoteStatus ? (
              <div className="text-xs text-gray-500">
                <span className="font-semibold">{quoteStatus}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Slippage tolerance (%)</div>
            <div className="flex flex-wrap items-center gap-2">
              {slippagePresets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSlippageTolerance(p)}
                  className={`px-3 py-1 rounded-lg border text-sm ${
                    slippageTolerance === p
                      ? "border-gray-800 text-gray-800"
                      : "border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {p}%
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <input
                  value={slippageTolerance}
                  onChange={(e) => setSlippageTolerance(e.target.value)}
                  inputMode="decimal"
                  className="w-20 h-9 px-2 rounded-lg border border-gray-200 text-sm text-gray-700"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleGetQuote}
              disabled={isQuoting || isConfirming}
              className={`flex-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 whitespace-nowrap ${
                isQuoting || isConfirming
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-800 hover:border-blue-500 text-gray-700"
              }`}
            >
              {isQuoting ? "Getting quote…" : "Get quote"}
            </button>

            <button
              type="button"
              onClick={handleConfirmQuote}
              disabled={!quoteData || isQuoting || isConfirming}
              className={`flex-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 whitespace-nowrap ${
                !quoteData || isQuoting || isConfirming
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-800 hover:border-blue-500 text-gray-700"
              }`}
            >
              {isConfirming ? "Confirming…" : "Confirm quote"}
            </button>
          </div>

          {quoteData?.display ? (
            <div className="mt-3 rounded-xl border border-gray-200 p-3 bg-white/60">
              <div className="text-sm font-semibold text-gray-800 mb-2">Quote</div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">From</div>
                  <div className="font-semibold text-gray-800">
                    {quoteData.display.fromSymbol}
                  </div>

                  <div className="mt-2 text-gray-500 text-xs">You send</div>
                  <div className="font-semibold text-gray-800">
                    {quoteData.display.amountInFormatted}{" "}
                    {quoteData.display.fromSymbol}
                  </div>

                  {quoteData.display.amountInUsd != null && (
                    <>
                      <div className="mt-2 text-gray-500 text-xs">Value (USD)</div>
                      <div className="font-semibold text-gray-800">
                        ${String(quoteData.display.amountInUsd)}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <div className="text-gray-500 text-xs">To</div>
                  <div className="font-semibold text-gray-800">
                    {quoteData.display.toSymbol}
                  </div>

                  <div className="mt-2 text-gray-500 text-xs">You receive (est.)</div>
                  <div className="font-semibold text-gray-800">
                    {quoteData.display.amountOutFormatted}{" "}
                    {quoteData.display.toSymbol}
                  </div>

                  {quoteData.display.amountOutUsd != null && (
                    <>
                      <div className="mt-2 text-gray-500 text-xs">
                        Receive (USD est.)
                      </div>
                      <div className="font-semibold text-gray-800">
                        ${String(quoteData.display.amountOutUsd)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="border-t border-gray-300 my-4"></div>

      <HelpMessage />

      <div ref={qrBlockRef} className="mt-2 relative z-10">
        <QrUriBlock
          uri={activeQrUri}
          profileName={recipientProfile?.display_name || recipientProfile?.name || "recipient"}
          forceShowQR={forceShowQR}
        />
      </div>
    </div>
  );
}
