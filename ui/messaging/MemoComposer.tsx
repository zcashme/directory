import { useMemo, useRef, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Profile } from "@/lib/profile/types";
import useEmojiAutocomplete from "@/ui/messaging/useEmojiAutocomplete";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import HelpMessage from "@/ui/verification/HelpMessage";
import QrUriBlock from "@/ui/verification/QrUriBlock";

const MAX_MEMO_BYTES = 512;

function fitToMaxBytes(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  let result = "";

  for (const ch of text) {
    const next = result + ch;
    if (encoder.encode(next).length > maxBytes) break;
    result = next;
  }

  return result;
}

function toBase64Url(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch { return ""; }
}

function buildZcashUri(address: string, amount: string = "0", memo: string = ""): string {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}
import { withFieldBorderState } from "@/ui/common/forms/styles";

interface MemoCounterProps {
  text: string;
}

interface MemoLeftIconProps {
  text: string;
}

function MemoLeftIcon({ text }: MemoLeftIconProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const showCircle = bytes > 128;

  if (!showCircle) {
    return (
      <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M3 11L4 8L9.5 2.5C9.9 2.1 10.5 2.1 10.9 2.5L11.5 3.1C11.9 3.5 11.9 4.1 11.5 4.5L6 10L3 11Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const remaining = Math.max(0, MAX_MEMO_BYTES - bytes);
  const remainingRatio = remaining / MAX_MEMO_BYTES;
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - remainingRatio);

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="rgba(156, 163, 175, 0.35)"
        strokeWidth="2"
      />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="var(--color-brand-blue)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="transition-[stroke-dashoffset] duration-200 ease-out"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transformBox: "fill-box",
        }}
      />
    </svg>
  );
}

function MemoCounter({ text }: MemoCounterProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const remaining = MAX_MEMO_BYTES - bytes;
  const showRemaining = remaining <= 20;

  return (
    <>
      {showRemaining && (
        <span className="absolute bottom-3 right-3 text-xs text-gray-500">
          {remaining} bytes remaining
        </span>
      )}
    </>
  );
}

interface AssetOption {
  id: string;
  symbol: string;
  chain?: string;
  logo?: string;
}

interface MemoComposerProps {
  profile: Profile;
  forceShowQR: boolean;
  asset?: string;
  assetOptions?: AssetOption[];
  onSetAsset?: (_asset: string) => void;
  // Controlled state props
  memo: string;
  setMemo: (_memo: string) => void;
  amount: string;
  setAmount: (_amount: string) => void;
}

export default function MemoComposer({
  profile,
  forceShowQR,
  asset = "ZEC",
  assetOptions = [],
  onSetAsset,
  memo,
  setMemo,
  amount,
  setAmount,
}: MemoComposerProps) {

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setMemoCapped = useCallback((value: string) => {
    setMemo(fitToMaxBytes(value, MAX_MEMO_BYTES));
  }, [setMemo]);

  const uri = useMemo(() =>
    buildZcashUri(profile.address, amount || "0", memo || ""),
    [profile.address, amount, memo]
  );

  const openWallet = () => {
    if (uri) window.open(uri, "_blank");
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [memo]);

  // Memo disabled: transparent addresses only
  const disabled = profile?.address?.startsWith("t");

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
    setValue: setMemoCapped,
  }) as {
    results: Array<{ ch: string; label: string }>;
    insert: (_item: { ch: string; label: string }) => void;
    update: () => void;
    highlightedIndex: number;
    placement: "top" | "bottom";
    setHighlightedIndex: (_index: number) => void;
    setOptionRef: (_index: number, _el: HTMLButtonElement | null) => void;
    handleKeyDown: (_e: ReactKeyboardEvent<HTMLTextAreaElement>) => boolean;
    close: () => void;
  };

  return (
    <div className="bg-transparent border-none shadow-none p-0 relative z-10">



      {/* MEMO FIELD */}
      <div className="relative mb-2">
        {!disabled && (
          <div className="absolute left-3 top-3 pointer-events-none text-gray-500 h-5 w-5 flex items-center justify-center">
            <MemoLeftIcon text={memo} />
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={3}
          value={memo}
          disabled={disabled}
          onChange={(e) => {
            const el = e.target;
            setMemoCapped(el.value);
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
            emoji.update();
          }}
          onBlur={emoji.close}
          onKeyDown={emoji.handleKeyDown}
          placeholder={
            disabled
              ? "Memos are not supported for transparent addresses"
              : `Write your message to ${recipientName} here...`
          }
          className={`border px-3 py-2 rounded-xl w-full text-md resize-none pr-7 text-gray-700 outline-hidden ${disabled
              ? "border-gray-800 bg-gray-100 text-gray-400 cursor-not-allowed pb-8"
              : `${withFieldBorderState("border-gray-800")} pl-8 pb-8`
            }`}
        />

        {emoji.results.length > 0 && !disabled && (
          <div
            className={`absolute left-0 z-50 w-[240px] max-h-48 overflow-y-auto rounded-xl border border-gray-800 bg-[var(--color-background)] shadow-lg ${
              emoji.placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {emoji.results.map((item, idx) => (
              <button
                key={`${item.ch}-${item.label}-${idx}`}
                ref={(el) => emoji.setOptionRef(idx, el)}
                type="button"
                className={`group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  emoji.highlightedIndex === idx
                    ? "bg-[var(--color-brand-blue)]/90 text-white"
                    : "text-gray-700 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                }`}
                onMouseEnter={() => emoji.setHighlightedIndex(idx)}
                onFocus={() => emoji.setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  emoji.insert(item);
                }}
              >
                <span className="text-lg">{item.ch}</span>
                <span
                  className={`truncate ${
                    emoji.highlightedIndex === idx
                      ? "text-white"
                      : "text-gray-700 group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {memo && !disabled && (
          <button
            onClick={() => setMemo("")}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 h-5 w-5 leading-none flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        <MemoCounter text={memo} />
      </div>

      {/* AMOUNT + WALLET */}
      <AmountAndWallet
        amount={amount}
        setAmount={setAmount}
        openWallet={openWallet}
        showOpenWallet={false}
        showUsdPill
        asset={asset}
        assetOptions={assetOptions}
        setAsset={onSetAsset}
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



