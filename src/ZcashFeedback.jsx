import Toast from "./Toast";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeCanvas } from "qrcode.react";
import { useFeedback } from "./store";

const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS;

function toBase64Url(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

function isValidZcashAddress(addr = "") {
  const prefixes = ["u1", "zs1", "ztestsapling", "t1", "tm"];
  return prefixes.some((p) => addr.startsWith(p));
}

function MemoCounter({ text }) {
  const rawBytes = new TextEncoder().encode(text).length;
  const encodedBytes = Math.ceil((rawBytes / 3) * 4);
  const maxBytes = 512;
  const remaining = maxBytes - encodedBytes;
  const over = remaining < 0;

  return (
    <p
      className={`text-xs text-right ${
        over ? "text-red-600" : "text-gray-400"
      }`}
    >
      {over
        ? `Over limit by ${-remaining} bytes (512 max)`
        : `${remaining} bytes remaining`}
    </p>
  );
}

export default function ZcashFeedback() {
  const [profiles, setProfiles] = useState([]);
  const [manualAddress, setManualAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [uri, setUri] = useState("");
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [qrShownOnce, setQrShownOnce] = useState(false);
  const [showDraft, setShowDraft] = useState(true);
  const { selectedAddress, setSelectedAddress, forceShowQR, setForceShowQR } = useFeedback();
  const [showEditLabel, setShowEditLabel] = useState(true);

  const showNotice = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  useEffect(() => {
    if (showDraft && (memo.trim() || amount.trim())) {
      setShowEditLabel(true);
      const t = setTimeout(() => setShowEditLabel(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showDraft, memo, amount]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("public_profile")
        .select("name, address")
        .order("name", { ascending: true });
      if (!error && data) setProfiles(data);
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const feedback = document.getElementById("zcash-feedback");
      if (!feedback) return;
      const rect = feedback.getBoundingClientRect();
      const nearBottom = rect.top < window.innerHeight * 0.8;
      setShowDraft(!nearBottom);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const addrToCheck =
      selectedAddress === "other" ? manualAddress : selectedAddress;

    if (!addrToCheck || typeof addrToCheck !== "string") return;

    if (addrToCheck.startsWith("t")) {
      setMemo("N/A");
    } else if (memo === "N/A") {
      setMemo("");
    }
  }, [selectedAddress, manualAddress]);

  useEffect(() => {
    const addrToUse =
      selectedAddress === "other" ? manualAddress.trim() : selectedAddress;
    if (!addrToUse || !isValidZcashAddress(addrToUse)) {
      setUri("");
      setError("Invalid or missing Zcash address.");
      return;
    }

    setError("");
    const params = new URLSearchParams();
    params.set("address", addrToUse);

    if (amount) {
      const numeric = amount.replace(/[^0-9.]/g, "");
      const num = parseFloat(numeric);
      if (!isNaN(num) && num >= 0) {
        const validAmount = num
          .toFixed(8)
          .replace(/0+$/, "")
          .replace(/\.$/, "");
        params.set("amount", validAmount);
      }
    }

    if (!addrToUse.startsWith("t") && memo.trim() && memo !== "N/A") {
      params.set("memo", toBase64Url(memo.trim()));
    }

    setUri(`zcash:?${params.toString()}`);
  }, [selectedAddress, manualAddress, amount, memo]);

  const handleCopyUri = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      showNotice("Zcash URI copied to clipboard!");
    } catch {
      showNotice("Unable to copy URI");
    }
  };

  const handleCopyAddress = async () => {
    try {
      const addrToCopy =
        selectedAddress === "other" ? manualAddress : selectedAddress;
      await navigator.clipboard.writeText(addrToCopy);
      showNotice("Zcash address copied to clipboard!");
    } catch {
      showNotice("Unable to copy address");
    }
  };

  const showResult = forceShowQR || !!(amount || (memo && memo !== "N/A"));

  return (
    <>
      {/* Floating Feedback (Write) button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <div className="relative">
          <button
            id="draft-button"
            onClick={() =>
              document
                .getElementById("zcash-feedback")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className={`relative text-white rounded-full w-14 h-14 shadow-lg text-lg font-bold transition-all duration-300
              ${showDraft ? "opacity-100 scale-100" : "opacity-70 scale-90"}
              bg-blue-600 hover:bg-blue-700 animate-pulse-slow`}
            title="Draft a memo"
          >
            ✎
          </button>

          <div
            className={`absolute bottom-1 right-full mr-3 transition-all duration-500 ease-out ${
              showDraft && (memo.trim() || amount.trim()) && showEditLabel
                ? "opacity-100 -translate-x-0"
                : "opacity-0 translate-x-2"
            }`}
          >
            {showDraft && (memo.trim() || amount.trim()) && showEditLabel && (
              <button
                onClick={() =>
                  document
                    .getElementById("zcash-feedback")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-sm font-semibold text-white bg-blue-700/90 px-3 py-1 rounded-full shadow-md hover:bg-blue-600 transition-colors duration-300 whitespace-nowrap"
                style={{ backdropFilter: "blur(4px)" }}
              >
                Edit Draft
              </button>
            )}
          </div>
        </div>
      </div>

      <div id="zcash-feedback" className="border-t mt-10 pt-6 text-center">
        <p className="text-sm text-gray-700 mb-4 text-center">
          <span className="text-black text-base leading-none align-middle">✎</span>{" "}
          Draft a message to{" "}
          <span className="font-semibold text-blue-700">
            {(() => {
              const match = profiles.find((p) => p.address === selectedAddress);
              return match?.name || "this Zcash user";
            })()}
          </span>{" "}
          and finalize it in your wallet.
        </p>

        {/* Unified input section */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="w-full max-w-xl">
            {/* Recipient */}
            <div className="relative flex flex-col w-full">
              <select
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm appearance-none w-full pr-8"
              >
                <option value={ADMIN_ADDRESS}>Feedback to Zcash.me Admin</option>
                {profiles.map((p) => (
                  <option key={p.address} value={p.address}>
                    {p.name} — {p.address.slice(0, 10)}…
                  </option>
                ))}
                <option value="other">Other (enter manually)</option>
              </select>


              <span className="absolute right-3 top-2 text-gray-500 text-sm select-none">
                Recipient
              </span>
            </div>

            {selectedAddress === "other" && (
              <div className="relative w-full mt-2">
                <input
                  type="text"
                  placeholder="Enter Zcash address"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full pr-8"
                />
                {manualAddress && (
                  <button
                    onClick={() => setManualAddress("")}
                    className="absolute right-3 top-2 text-gray-400 hover:text-red-500 text-sm font-semibold"
                    aria-label="Clear manual address"
                  >
                    ⛌
                  </button>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="relative w-full mt-3">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount (ZEC) (optional)"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                className="border rounded-lg px-3 py-2 text-sm w-full pr-10"
              />
              {amount && (
                <button
                  onClick={() => setAmount("")}
                  className="absolute right-3  top-2 text-gray-400 hover:text-red-500 text-sm font-semibold"
                  aria-label="Clear amount"
                >
                  ⛌
                </button>
              )}

            </div>

            {/* Memo */}
            <div className="relative w-full mt-3">
              <textarea
                rows={3}
                placeholder="Memo (optional)"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={
                  (selectedAddress === "other"
                    ? manualAddress?.startsWith("t")
                    : selectedAddress?.startsWith("t")) || false
                }
                className={`border rounded-lg px-3 py-2 text-sm w-full resize-y pr-8 ${
                  (selectedAddress === "other"
                    ? manualAddress?.startsWith("t")
                    : selectedAddress?.startsWith("t"))
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : ""
                }`}
              />
              {memo && memo !== "N/A" && (
                <button
                  onClick={() => setMemo("")}
                  className="absolute right-3 top-2 text-gray-400 hover:text-red-500 text-sm font-semibold"
                  aria-label="Clear memo"
                >
                  ⛌
                </button>
              )}
              <div className="absolute right-3 -bottom-5">
                {!selectedAddress?.startsWith("t") && <MemoCounter text={memo} />}
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {showResult && !error && uri && (
          <div className="flex flex-col items-center gap-3 mt-6 animate-fadeIn">
            <QRCodeCanvas value={uri} size={200} includeMargin={true} />
            {showFull ? (
              <>
                <a
                  href={uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline break-all text-sm"
                >
                  {uri}
                </a>
                <button
                  onClick={() => setShowFull(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowFull(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Show More
              </button>
            )}
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleCopyUri}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copy URI
              </button>
              <a
                href={uri}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Open in Wallet
              </a>
            </div>
          </div>
        )}

        <Toast
          message={toastMsg}
          show={showToast}
          onClose={() => setShowToast(false)}
        />
      </div>

      <style>{`
        @keyframes fadeIn { 
          from {opacity:0;transform:scale(.98)} 
          to {opacity:1;transform:scale(1)} 
        }
        .animate-fadeIn { animation: fadeIn .4s ease-out }
        @keyframes pulseSlow { 
          0%, 100% { transform: scale(1); opacity: 1; } 
          50% { transform: scale(1.00); opacity: 1; } 
        }
        .animate-pulse-slow { animation: pulseSlow 2.5s ease-in-out infinite; }
      `}</style>
    </>
  );
}
