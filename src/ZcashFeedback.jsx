import Toast from "./Toast";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeCanvas } from "qrcode.react";
import { useFeedback } from "./store";

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
      className={`text-xs text-right mt-1 ${
        over ? "text-red-600" : "text-gray-500"
      }`}
    >
      {over
        ? `Over limit by ${-remaining} bytes (512 max)`
        : `${remaining} bytes remaining`}
    </p>
  );
}

export default function ZcashFeedback() {
  const ADMIN_ADDRESS =
    "u1s6qvd4lfrrvjkr9xp8kpgjsrfr5azw0mum8xvcs2286fn4u6ugqsyh5h2r24peg4kqaxfvrullqnkry48crqw60w7lczhl2sthh57k433lnya9dr6lz5u8cj3ckfy9lzplnsvhfect0g3y87rf69r8pxpt7hh8pr7lkwegmxzez8aeguqwhdrtnj83mfg443msyuvaqx7nnry6q3j7q";

  const [profiles, setProfiles] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(ADMIN_ADDRESS);
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
const { selectedAddress: globalAddress } = useFeedback();

  const showNotice = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
  };
useEffect(() => {
  if (globalAddress && globalAddress !== selectedAddress) {
    setSelectedAddress(globalAddress);
    document
      .getElementById("zcash-feedback")
      ?.scrollIntoView({ behavior: "smooth" });
  }
}, [globalAddress]);

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


  // handle t-address memo behavior
  useEffect(() => {
    const addrToCheck =
      selectedAddress === "other" ? manualAddress : selectedAddress;
    if (addrToCheck.startsWith("t")) setMemo("N/A");
    else if (memo === "N/A") setMemo("");
  }, [selectedAddress, manualAddress]);

  // construct URI
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

  const showResult = !!(amount || (memo && memo !== "N/A"));

  useEffect(() => {
    if (showResult && !error && uri && !qrShownOnce) {
      showNotice(
        "Scan the QR or click 'Open in Wallet' to prepare the transaction. Review and approve it in your wallet."
      );
      setQrShownOnce(true);
    }
  }, [showResult, error, uri, qrShownOnce]);

  return (
    <>
     {/* Animated Draft Button */}
  <button
    id="draft-button"
    onClick={() =>
      document
        .getElementById("zcash-feedback")
        ?.scrollIntoView({ behavior: "smooth" })
    }
    className={`fixed bottom-6 right-6 z-40 text-white rounded-full w-14 h-14 shadow-lg transition-all duration-300 text-lg font-bold
      ${showDraft ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}
      bg-blue-600 hover:bg-blue-700 animate-pulse-slow`}
    title="Go to Feedback"
  >
    ✎
  </button>


      <div id="zcash-feedback" className="border-t mt-10 pt-6 text-center">
        <p className="text-sm text-gray-600 mb-4">
          Prepare a message to approve on your wallet.
        </p>

        {/* Top row: recipient, copy button, amount */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-3">
          <div className="flex flex-col w-full sm:w-1/3">
            <select
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value={ADMIN_ADDRESS}>Feedback to Zcash.me Admin</option>
              {profiles.map((p) => (
                <option key={p.address} value={p.address}>
                  {p.name} — {p.address.slice(0, 10)}…
                </option>
              ))}
              <option value="other">Other (enter manually)</option>
            </select>
            {selectedAddress === "other" && (
              <input
                type="text"
                placeholder="Enter Zcash address"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm mt-2"
              />
            )}
          </div>

          <button
            onClick={handleCopyAddress}
            className="px-3 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            ⧉  Address
          </button>

          <div className="relative w-full sm:w-1/4">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount (optional)"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^\d.]/g, ""))
              }
              className="border rounded-lg px-3 py-2 text-sm w-full pr-10"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm select-none">
              ZEC
            </span>
          </div>
        </div>

        {/* Memo row */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-full sm:w-3/4">
            <textarea
              rows={3}
              placeholder="Memo (optional)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={
                (selectedAddress === "other"
                  ? manualAddress.startsWith("t")
                  : selectedAddress.startsWith("t")) || false
              }
              className={`border rounded-lg px-3 py-2 text-sm w-full resize-y ${
                (selectedAddress === "other"
                  ? manualAddress.startsWith("t")
                  : selectedAddress.startsWith("t"))
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : ""
              }`}
            />
            {!selectedAddress.startsWith("t") && <MemoCounter text={memo} />}
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

        {/* Toast Notification */}
        <Toast
          message={toastMsg}
          show={showToast}
          onClose={() => setShowToast(false)}
        />

        <style>
          {`
          @keyframes fadeIn { from {opacity:0;transform:scale(.98)} to {opacity:1;transform:scale(1)} }
          .animate-fadeIn { animation: fadeIn .4s ease-out }
          @keyframes pulseSlow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.00); opacity: 1; }
}
.animate-pulse-slow { animation: pulseSlow 2.5s ease-in-out infinite; }

          `}
          
        </style>
      </div>
    </>
  );
}
