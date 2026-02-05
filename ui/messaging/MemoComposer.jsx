import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useFeedback, useFeedbackController } from "@/ui/messaging/useFeedback";
import useEmojiAutocomplete from "@/ui/messaging/useEmojiAutocomplete";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import HelpMessage from "@/ui/verification/HelpMessage";

import QrUriBlock from "@/ui/verification/QrUriBlock";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
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

  const textareaRef = useRef(null);

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

  // Swap mode detection
  const isSwapMode = originTokenId !== null && zecTokenId !== null && originTokenId !== zecTokenId;
  
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
                ? "Memos are not supported for cross-chain swaps"
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
      />

      {/* Divider line like Verify */}
      <div className="border-t border-gray-300 my-4"></div>

      <HelpMessage />

      {/* QR / URI BLOCK */}
      <div className="-mt-4">
        <QrUriBlock
          uri={uri}
          profileName={
            profile?.display_name ||
            profile?.name ||
            "recipient"
          }
          forceShowQR={forceShowQR}
        />
      </div>
    </div>
  );
}
