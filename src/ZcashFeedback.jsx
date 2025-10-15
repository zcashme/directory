import Toast from "./Toast";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeCanvas } from "qrcode.react";
import { useFeedback } from "./store";

/* -------------------------------------------------------
   Constants
------------------------------------------------------- */
const SIGNIN_ADDR =
  "u1qzt502u9fwh67s7an0e202c35mm0h534jaa648t4p2r6mhf30guxjjqwlkmvthahnz5myz2ev7neff5pmveh54xszv9njcmu5g2eent82ucpd3lwyzkmyrn6rytwsqefk475hl5tl4tu8yehc0z8w9fcf4zg6r03sq7lldx0uxph7c0lclnlc4qjwhu2v52dkvuntxr8tmpug3jntvm";
const MIN_SIGNIN_AMOUNT = 0.0005;

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */
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
  return typeof addr === "string" && prefixes.some((p) => addr.startsWith(p));
}

function getSignInMemoText(userAddr = "") {
  return `

  --- Do not modify below! ---
ZM! Sign-in code request for
${userAddr}
`;
}

function MemoCounter({ text }) {
  const rawBytes = new TextEncoder().encode(text).length;
  const encodedBytes = Math.ceil((rawBytes / 3) * 4);
  const remaining = 512 - encodedBytes;
  const over = remaining < 0;

  return (
    <p className={`text-xs text-right ${over ? "text-red-600" : "text-gray-400"}`}>
      {over
        ? `Over limit by ${-remaining} bytes (512 max)`
        : `${remaining} bytes remaining`}
    </p>
  );
}

/* -------------------------------------------------------
   Component
------------------------------------------------------- */
export default function ZcashFeedback({ compact = false }) {
  const [profiles, setProfiles] = useState([]);
  const [manualAddress, setManualAddress] = useState("");
// Independent values for each mode
const [draftAmount, setDraftAmount] = useState("");
const [draftMemo, setDraftMemo] = useState("");
const [signInMemo, setSignInMemo] = useState(getSignInMemoText());
const [signInAmount, setSignInAmount] = useState("0.001");
// Derived display values based on mode
const [mode, setMode] = useState("note");
const amount = mode === "signin" ? signInAmount : draftAmount;
const memo = mode === "signin" ? signInMemo : draftMemo;

  const [uri, setUri] = useState("");
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [qrShownOnce, setQrShownOnce] = useState(false);
  const [showDraft, setShowDraft] = useState(true);
  const [showEditLabel, setShowEditLabel] = useState(true);
  const [copied, setCopied] = useState(false);
  const [walletOpened, setWalletOpened] = useState(false);
  
const [showCodeInput, setShowCodeInput] = useState(false);
const [codeValue, setCodeValue] = useState("");
const [codeSubmitted, setCodeSubmitted] = useState(false);
const [showSigninWarning, setShowSigninWarning] = useState(false);


  const { selectedAddress, setSelectedAddress, forceShowQR, setForceShowQR } = useFeedback();

  const showNotice = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  /* -----------------------------------------------------
     Sign-in quick action
  ----------------------------------------------------- */
  const handleSignIn = () => {
    const userAddr =
      selectedAddress === "other" ? manualAddress.trim() : selectedAddress || "(unknown)";
    const memoText = getSignInMemoText(userAddr);

    const params = new URLSearchParams();
    params.set("address", SIGNIN_ADDR);
    params.set("amount", MIN_SIGNIN_AMOUNT.toFixed(3));
    params.set("memo", toBase64Url(memoText));

    const signinUri = `zcash:?${params.toString()}`;

    setMode("signin");
    setMemo(memoText);
    setAmount(MIN_SIGNIN_AMOUNT.toFixed(3));
    setForceShowQR(true);
    setError("");
    setUri(signinUri);
    window.open(signinUri, "_blank");
  };

  /* -----------------------------------------------------
     Effects
  ----------------------------------------------------- */
  useEffect(() => {
    if (showDraft && (memo.trim() || amount.trim())) {
      setShowEditLabel(true);
      const t = setTimeout(() => setShowEditLabel(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showDraft, memo, amount]);
// 🔧 INSERT THIS EFFECT (keeps everything else unchanged)
useEffect(() => {
  // compute the user's address to show inside the memo
  const addr =
    selectedAddress === "other"
      ? (manualAddress || "").trim()
      : (selectedAddress || "");

  // only update the sign-in memo when you're actually in sign-in mode,
  // otherwise leave the draft memo untouched
  if (mode === "signin") {
    setSignInMemo(getSignInMemoText(addr || "(unknown)"));
  }
}, [mode, selectedAddress, manualAddress]);

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
  if (mode === "signin") return;
  const addr = selectedAddress === "other" ? manualAddress : selectedAddress;
  if (!addr) return;
  if (addr.startsWith("t")) setDraftMemo("N/A");
  else if (draftMemo === "N/A") setDraftMemo("");
}, [mode, selectedAddress, manualAddress]);


  useEffect(() => {
    const addr =
      mode === "signin"
        ? SIGNIN_ADDR
        : selectedAddress === "other"
        ? manualAddress.trim()
        : selectedAddress;

    if (!addr || !isValidZcashAddress(addr)) {
      setUri("");
      setError("Invalid or missing Zcash address.");
      return;
    }

    setError("");
    const params = new URLSearchParams();
    params.set("address", addr);

    if (amount) {
      const numeric = amount.replace(/[^0-9.]/g, "");
      const num = parseFloat(numeric);
      if (!isNaN(num) && num >= MIN_SIGNIN_AMOUNT) {
        const validAmount = num.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
        params.set("amount", validAmount);
      } else if (mode === "signin") {
        setError(`Sign-in requires sending at least ${MIN_SIGNIN_AMOUNT} ZEC.`);
      }
    }

    if (!addr.startsWith("t") && memo.trim() && memo !== "N/A") {
      params.set("memo", toBase64Url(memo.trim()));
    }

    setUri(`zcash:?${params.toString()}`);
  }, [mode, selectedAddress, manualAddress, amount, memo]);

  const showResult = forceShowQR || !!(amount || (memo && memo !== "N/A"));

  /* -----------------------------------------------------
     Render
  ----------------------------------------------------- */
  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <div className="relative">
          <button
            id="draft-button"
            onClick={() => {
              setMode("note");
              document.getElementById("zcash-feedback")?.scrollIntoView({ behavior: "smooth" });
              window.dispatchEvent(new CustomEvent("closeDirectory"));
            }}
            className={`relative text-white rounded-full w-14 h-14 shadow-lg text-lg font-bold transition-all duration-300 ${
              showDraft ? "opacity-100 scale-100" : "opacity-70 scale-90"
            } bg-blue-600 hover:bg-blue-700 animate-pulse-slow`}
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
                  document.getElementById("zcash-feedback")?.scrollIntoView({ behavior: "smooth" })
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

      {/* Main Section */}
      <div id="zcash-feedback" className={`${compact ? "" : "border-t mt-10 pt-6"} text-center`}>
        {/* Toggle */}
        <div className="flex justify-center items-center mb-2 relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 transform">
           <div className="inline-flex border border-gray-300 rounded-full overflow-hidden text-sm shadow-sm">
  <button
    onClick={() => {
      setMode("note");
      setForceShowQR(false);
      // Do not clear or overwrite draft fields
    }}
    className={`px-3 py-1 font-medium transition-colors ${
      mode === "note"
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-600 hover:bg-gray-100"
    }`}
  >
    ✎ Draft
  </button>

  <button
    onClick={() => {
      setMode("signin");
      setForceShowQR(true);
      setShowFull(false);
      // The sign-in form already has its own prefilled memo/amount
    }}
    className={`px-3 py-1 font-medium transition-colors ${
      mode === "signin"
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-600 hover:bg-gray-100"
    }`}
  >
    🔐 Sign In
  </button>
</div>

          </div>
        </div>

        {/* Recipient Label */}
{/* Recipient Label */}
<p className="text-sm text-gray-700 mb-4 text-center">
  {mode === "signin" ? (
    <div className="mt-2 text-xs text-red-400 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-left">
      ⚠ <strong>Sign-In Requests</strong> are not yet active.
      <button
        onClick={() => setShowSigninWarning(!showSigninWarning)}
        className="ml-2 text-blue-600 hover:underline text-xs font-semibold"
      >
        {showSigninWarning ? "Hide" : "More"}
      </button>
      {showSigninWarning && (
        <span className="block mt-1 text-blue-400">
          This feature is currently under development.  
          You can experiment safely, but no codes will be validated and  
          sign-in requests will not produce a working authentication flow yet.
        </span>
      )}

    </div>
  ) : (
    <>
      ✎ Draft a note to{" "}
      <span className="font-semibold text-blue-700">
        {(() => {
          const match = profiles.find((p) => p.address === selectedAddress);
          return match?.name || "a Zcash user";
        })()}
      </span>
      :
    </>
  )}
</p>


        {/* Form */}

        {/* Input section */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="w-full max-w-xl">
            {/* Recipient select */}
{/* Recipient */}
<div className="relative flex flex-col w-full">
  {mode === "signin" ? (
    <div className="border rounded-lg px-3 py-2 text-sm bg-transparent-50 text-gray-700">
      <span className="font-semibold">Send Request for Codewords</span>{" "}
    
      <div className="truncate text-gray-500 text-xs mt-1">
         Requires at least {MIN_SIGNIN_AMOUNT} ZEC</div>

    </div>
    
  ) : (
    <>
      <select
        value={selectedAddress}
        onChange={(e) => setSelectedAddress(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm appearance-none w-full pr-8"
      >
        <option value="" disabled>
          Select a member of the directory
        </option>
        {profiles.map((p) => (
          <option key={p.address} value={p.address}>
            {p.name} — {p.address.slice(0, 10)}…
          </option>
        ))}
        <option value="other">Other (enter manually)</option>
      </select>
      <span className="absolute right-3 top-2 text-gray-500 text-sm select-none">˅</span>
    </>
  )}
</div>


            {/* Manual address */}
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

{/* Memo */}
<div className="relative w-full mt-3">
  <textarea
    ref={(el) => {
      if (el) {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }
    }}
    rows={1}
    placeholder={mode === "signin" ? "Enter code when received" : "Memo (optional)"}
    value={mode === "signin" ? signInMemo : draftMemo}
    onChange={(e) => {
      const el = e.target;
      if (mode === "signin") setSignInMemo(el.value);
      else setDraftMemo(el.value);
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }}
    disabled={
      mode !== "signin" &&
      ((selectedAddress === "other"
        ? manualAddress?.startsWith("t")
        : selectedAddress?.startsWith("t")) ||
        false)
    }
    className={`border rounded-lg px-3 py-2 text-sm w-full resize-none overflow-hidden pr-8 pb-6 relative ${
      mode !== "signin" &&
      (selectedAddress === "other"
        ? manualAddress?.startsWith("t")
        : selectedAddress?.startsWith("t"))
        ? "bg-gray-300 text-gray-400 cursor-not-allowed"
        : ""
    }`}
  />
  {(mode === "signin" ? signInMemo : draftMemo) &&
    (mode === "signin" ? signInMemo : draftMemo) !== "N/A" && (
      <button
        onClick={() =>
          mode === "signin" ? setSignInMemo("") : setDraftMemo("")
        }
        className="absolute right-3 top-2 text-gray-400 hover:text-red-500 text-sm font-semibold"
        aria-label="Clear memo"
      >
        ⛌
      </button>
    )}

              {memo &&
                (mode === "signin" ||
                  !(selectedAddress === "other"
                    ? manualAddress?.startsWith("t")
                    : selectedAddress?.startsWith("t"))) && (
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                    <MemoCounter text={memo} />
                  </div>
                )}
            </div>

            {/* Amount + buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-2">
              <div className="flex-1 w-full sm:w-1/2 flex items-center">
                <div className="relative w-full">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={mode === "signin" ? `${MIN_SIGNIN_AMOUNT} ZEC` : "0.0000 ZEC (optional)"}
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d.]/g, "");
                      mode === "signin" ? setSignInAmount(value) : setDraftAmount(value);
                    }}
                    className="border rounded-lg px-3 py-2 text-sm w-full pr-10 bg-transparent"
                  />
                  {amount && (
                    <button
                      onClick={() => (mode === "signin" ? setSignInAmount("") : setDraftAmount(""))}
                      className="absolute right-3 top-2 text-gray-400 hover:text-red-500 text-sm font-semibold"
                      aria-label="Clear amount"
                    >
                      ⛌
                    </button>
                  )}

                </div>
              </div>
{/* Codewords input (Sign-In mode only) */}
{mode === "signin" && showCodeInput && (
  <div className="w-full mt-3 text-left animate-fadeIn">
    <label className="block text-sm text-gray-700 mb-1">Sign-In Code</label>
    <input
      type="text"
      placeholder="Enter the codewords you receive"
      value={codeValue}
      onChange={(e) => setCodeValue(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
    />
    <p className="text-xs text-gray-500 mt-1">Enter the codewords you receive.</p>
  </div>
)}


              {/* Action buttons */}
<div className="flex-1 w-full sm:w-1/2 flex justify-center sm:justify-end gap-2 mt-4 sm:mt-6">
  {/* Copy URI */}
  <button
    onClick={async () => {
      if (error) return;
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }}
    disabled={!!error}
    className={`flex items-center gap-1 border rounded-xl px-3 py-1.5 text-sm transition-all duration-200 ${
      error
        ? "border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
        : copied
        ? "border-green-500 text-green-600 bg-green-50"
        : "border-gray-500 hover:border-blue-500 text-gray-700"
    }`}
  >
    <span>{copied ? "Copied!" : "⧉ Copy URI"}</span>
  </button>

  {/* Open in Wallet */}
  <button
    onClick={() => {
      if (error) return;
      if (mode === "signin") {
        handleSignIn();
        return;
      }
      window.open(uri, "_blank");
      setWalletOpened(true);
      setTimeout(() => setWalletOpened(false), 1500);
    }}
    disabled={!!error}
    className={`flex items-center gap-1 border rounded-xl px-3 py-1.5 text-sm transition-all duration-200 ${
      error
        ? "border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
        : walletOpened
        ? "border-green-500 text-green-600 bg-green-50"
        : "border-gray-500 hover:border-blue-500 text-gray-700"
    }`}
  >
    <span>⇱ Open in Wallet</span>
  </button>

  {/* I Sent It (Sign-In only) */}
{/* I Sent It / Submit Code — Sign-In only */}
{/* I Sent It / Submit Code — Sign-In only */}
{mode === "signin" && (
  <button
    onClick={() => {
      if (!showCodeInput) {
        setShowCodeInput(true);
        setCodeSubmitted(false);
      } else if (codeValue.trim()) {
        // Simulate successful submission
        setCodeSubmitted(true);
        setTimeout(() => {
          setCodeSubmitted(false);
          setShowCodeInput(false);
          setCodeValue("");
        }, 1500);
      }
    }}
    disabled={showCodeInput && !codeValue.trim()}
    className={`flex items-center gap-1 border rounded-xl px-3 py-1.5 text-sm transition-all duration-200 ${
      codeSubmitted
        ? "border-green-500 text-green-600 bg-green-50"
        : showCodeInput
        ? codeValue.trim()
          ? "border-blue-500 text-blue-700 hover:bg-transparent-50"
          : "border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
        : "border-gray-500 hover:border-blue-500 text-gray-700"
    }`}
  >
    {codeSubmitted ? (
      <>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Submitted!</span>
      </>
    ) : (
      <span>{showCodeInput ? "Verify Code ➤" : "I Sent It!"}</span>
    )}
  </button>
)}

</div>

            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {showResult && !error && uri && (
          <div className="flex flex-col items-center gap-3 mt-6 animate-fadeIn">
            <QRCodeCanvas value={uri} size={300} includeMargin={true} bgColor="transparent" fgColor="#000000" />

            {showFull ? (
              <>
                <a href={uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all text-sm">
                  {uri}
                </a>
                <button onClick={() => setShowFull(false)} className="text-xs text-gray-500 hover:text-gray-700">
                  Hide
                </button>
              </>
            ) : (
              <button onClick={() => setShowFull(true)} className="text-xs text-blue-600 hover:underline">
                Show URI
              </button>
            )}
          </div>
        )}

        <Toast message={toastMsg} show={showToast} onClose={() => setShowToast(false)} />
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
          @keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn { animation: fadeIn 0.25s ease-out; }

        .animate-pulse-slow { animation: pulseSlow 2.5s ease-in-out infinite; }
      `}</style>
    </>
  );
}

