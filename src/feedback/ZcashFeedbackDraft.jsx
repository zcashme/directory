import React, { useState, useMemo, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useFeedback } from "../hooks/useFeedback";
import useFeedbackController from "../hooks/useFeedbackController";
import AmountAndWallet from "../components/AmountAndWallet.jsx";
import { cachedProfiles } from "../hooks/useProfiles";
import QrUriBlock from "../components/QrUriBlock";
import ProfileSearchDropdown from "../components/ProfileSearchDropdown";
import bookOpen from "../assets/book-open.svg";
import bookClosed from "../assets/book-closed.svg";

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

export default function ZcashFeedbackDraft() {
  const { selectedAddress, setSelectedAddress, forceShowQR } = useFeedback();
  const { uri, memo, amount, openWallet, setDraftMemo, setDraftAmount } =
    useFeedbackController();

  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef(null);

  const [showHelp, setShowHelp] = useState(false); // <-- NEW

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (cachedProfiles || []).filter(
      (p) => p.name?.toLowerCase().includes(q) || p.address?.includes(q)
    );
  }, [search]);

  const handleSelect = (addr) => {
    setSelectedAddress(addr);
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

  const disabled = selectedAddress?.startsWith("t");
  const recipientName =
    cachedProfiles.find((p) => p.address === selectedAddress)?.name || "Recipient";

useEffect(() => {
  if (!forceShowQR) return;
  setTimeout(() => {
    const el = document.getElementById("zcash-feedback");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 300);
}, [forceShowQR]);

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
                    handleSelect(v.address);
                  } else {
                    setSearch(v);
                  }
                }}
                profiles={filtered}
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
          }}
          placeholder={
            disabled
              ? "Memos are not supported for transparent addresses"
              : `Write your message to ${recipientName} here...`
          }
          className={`border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none pr-7 text-gray-700 ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "focus:ring-1 focus:ring-blue-500 pl-8"
          }`}
        />

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
      />

      {/* HELP MESSAGE (same style as Verify) */}
      {showHelp && (
        <p className="mx-1 mt-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-snug">
          Review your message to
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {" "}{cachedProfiles.find((p) => p.address === selectedAddress)?.name ||
              "Recipient"}
          </span>
             {" "} in your wallet before sending it. Use the button, scan the QR or tap the URI.
          
        </p>
      )}
{/* Requirement + Help under help banner, above QR divider */}
<div className="w-full flex items-center justify-center gap-2 text-center mt-2 mb-3">
  <p className="text-[12px] text-gray-600 italic m-0">
    Approve the transaction in your wallet.
  </p>

  <button
    type="button"
    onClick={() => setShowHelp(!showHelp)}
    className="text-[12px] font-semibold text-blue-600 underline m-0"
  >
    {showHelp ? "Hide help" : "Help"}
  </button>
</div>

      {/* Divider line like Verify */}
      <div className="border-t border-gray-300 my-4"></div>

      {/* QR / URI BLOCK */}
      <QrUriBlock
        uri={uri}
        profileName={
          cachedProfiles.find((p) => p.address === selectedAddress)?.name ||
          "recipient"
        }
        forceShowQR={forceShowQR}
      />
    </div>
  );
}
