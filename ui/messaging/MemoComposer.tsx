import { useMemo, useRef, useEffect } from "react";
import type { Profile } from "@/lib/profile/types";
import { useMessagingStore } from "@/lib/stores/messaging";
import useEmojiAutocomplete from "@/ui/messaging/useEmojiAutocomplete";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import HelpMessage from "@/ui/verification/HelpMessage";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import { buildZcashUri } from "@/lib/zcash/zcashUtils";
import { withFieldBorderState } from "@/ui/styles/fields";

interface MemoCounterProps {
  text: string;
}

function MemoCounter({ text }: MemoCounterProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const over = bytes > 512;
  const diff = over ? bytes - 512 : 512 - bytes;

  return (
    <span className={`absolute bottom-3 right-3 text-md ${over ? "text-red-600" : "text-gray-400"}`}>
      {over ? `Over by ${diff} bytes` : `${diff} bytes left`}
    </span>
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
}

export default function MemoComposer({
  profile,
  forceShowQR,
  asset = "ZEC",
  assetOptions = [],
  onSetAsset,
}: MemoComposerProps) {
  const { memo, amount, setMemo, setAmount } = useMessagingStore();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    setValue: setMemo,
  }) as {
    results: Array<{ ch: string; label: string }>;
    insert: (_item: { ch: string; label: string }) => void;
    update: () => void;
    close: () => void;
  };

  return (
    <div className="bg-transparent border-none shadow-none p-0 -mt-4 relative z-10">



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
            setMemo(el.value);
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
            emoji.update();
          }}
          onBlur={emoji.close}
          placeholder={
            disabled
              ? "Memos are not supported for transparent addresses"
              : `Write your message to ${recipientName} here...`
          }
          className={`border px-3 py-2 rounded-xl w-full text-md resize-none pr-7 text-gray-700 outline-hidden ${disabled
              ? "border-gray-800 bg-gray-100 text-gray-400 cursor-not-allowed"
              : `${withFieldBorderState("border-gray-800")} pl-8`
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
            onClick={() => setMemo("")}
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
