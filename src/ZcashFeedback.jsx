import Toast from "./Toast";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { QRCodeCanvas } from "qrcode.react";
import { useFeedback } from "./store";
import useProfiles from "./hooks/useProfiles";
import VerifiedBadge from "./components/VerifiedBadge";

/* -------------------------------------------------------
   Constants
------------------------------------------------------- */
const SIGNIN_ADDR =
  "u1qzt502u9fwh67s7an0e202c35mm0h534jaa648t4p2r6mhf30guxjjqwlkmvthahnz5myz2ev7neff5pmveh54xszv9njcmu5g2eent82ucpd3lwyzkmyrn6rytwsqefk475hl5tl4tu8yehc0z8w9fcf4zg6r03sq7lldx0uxph7c0lclnlc4qjwhu2v52dkvuntxr8tmpug3jntvm";
const MIN_SIGNIN_AMOUNT = 0.001;
const DEFAULT_SIGNIN_AMOUNT = MIN_SIGNIN_AMOUNT * 2;


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

/* -------------------------------------------------------
   Build Compact Edit Memo
------------------------------------------------------- */
function buildZcashEditMemo(profile = {}, zid = "?", addr = "") {
  // Compact field mappings
  const fieldMap = {
    name: "n",
    bio: "b",
    profile_image_url: "i",
    links: "l",
  };

  // Filter out blank values
  const clean = Object.fromEntries(
    Object.entries(profile).filter(([_, v]) => {
      if (Array.isArray(v)) return v.some((x) => x && x.trim() !== "");
      return v !== "" && v !== null && v !== undefined;
    })
  );

  // Detect if user actually changed the address (and it’s not blank)
  const includeAddress = "address" in clean && clean.address.trim() !== "";

  // Build compact list
  const compactPairs = Object.entries(clean)
    .filter(([k]) => k !== "address") // handle address separately
    .map(([key, value]) => {
      const shortKey = fieldMap[key] || key;
      if (Array.isArray(value)) {
        return `${shortKey}:[${value
          .filter((x) => x && x.trim() !== "")
          .map((x) => `"${x}"`)
          .join(",")}]`;
      }
      return `${shortKey}:"${value}"`;
    });

  // 🧩 Construct final payload
  const payload =
    compactPairs.length > 0 || includeAddress
      ? `{z:${zid}${
          includeAddress ? `,a:"${clean.address.trim()}"` : ""
        }${compactPairs.length ? `,${compactPairs.join(",")}` : ""}}`
      : `{z:${zid}}`;

  return payload;
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
        : `+${remaining} bytes`}
    </p>
  );
}

/* -------------------------------------------------------
   Component
------------------------------------------------------- */
export default function ZcashFeedback({ compact = false }) {
   const [activeZId, setActiveZId] = useState(null);
const [profiles, setProfiles] = useState([]);
  const [manualAddress, setManualAddress] = useState("");
// Independent values for each mode
const [draftAmount, setDraftAmount] = useState("");
const [draftMemo, setDraftMemo] = useState("");
const [signInMemo, setSignInMemo] = useState("pro:{}");
// const [signInAmount, setSignInAmount] = useState("0.002");
const [signInAmount, setSignInAmount] = useState(DEFAULT_SIGNIN_AMOUNT.toFixed(3));
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
// 🔄 Bring in the same cached profiles used by the Directory
const { profiles: cachedProfiles } = useProfiles();

// ✅ Auto-sync selected profile when navigating to /[user]
useEffect(() => {
  // Look for an active card in the DOM (ProfileCard full view)
  const activeCard = document.querySelector('[data-active-profile]');
  if (activeCard) {
    const addr = activeCard.getAttribute('data-address');
    if (addr && addr !== selectedAddress) {
      setSelectedAddress(addr);
    }
  }
}, [setSelectedAddress, selectedAddress]);

  const { pendingEdits } = useFeedback();

  const showNotice = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  useEffect(() => {
  if (import.meta.env.DEV && selectedAddress) {
    console.log(
      `💬 ZcashFeedback linked: selectedAddress=${selectedAddress}`
    );
  }
}, [selectedAddress]);

  /* -----------------------------------------------------
     Sign-in quick action
  ----------------------------------------------------- */
  const handleSignIn = () => {
    const userAddr =
      selectedAddress === "other" ? manualAddress.trim() : selectedAddress || "(unknown)";
    
// Build memo using both profile edits and link tokens
// Build memo using both profile edits and link tokens
const linkTokens = pendingEdits?.l || [];

// merge profile edits + link tokens before building
const mergedProfile = {
  ...(pendingEdits?.profile || {}),
  links: pendingEdits?.l || [],
};

const memoText = buildZcashEditMemo(
  { ...(pendingEdits?.profile || {}), links: pendingEdits?.l || [] },
  zId ?? "?",
  addr
);


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
  // Listen for the flip event to switch to sign-in mode and load edits
// ✅ Enhanced flip handling with Supabase ID and address sync
// ✅ Enhanced flip handling with Supabase ID, address, and verification sync
useEffect(() => {
  // If this component loads after a flip already happened, restore last known details
if (window.lastZcashFlipDetail) {
  const { zId, address, name, verified } = window.lastZcashFlipDetail;
  if (zId && address) {
    setActiveZId(zId);
    setSelectedAddress(address);
    setMode("signin");
  }
}

  const updateMemo = (zId = null, addr = "", name = "", verified = false) => {
    if (mode !== "signin") return;

const memoText = buildZcashEditMemo(
  { ...(pendingEdits?.profile || {}), links: pendingEdits?.l || [] },
  zId ?? "?",
  addr
);

    setSignInMemo(memoText);
  };

  const handleFlip = (e) => {
    const zId = e.detail?.zId ?? null;
    const addr = e.detail?.address ?? "";
    const name = e.detail?.name ?? "";
    const verified = e.detail?.verified ?? false;

    // console.log("🪪 Received enterSignInMode →", { zId, addr, name, verified });
window.lastZcashFlipDetail = { zId, address: addr, name, verified };

    setMode("signin");
    setActiveZId(zId);
    setSelectedAddress(addr);
    updateMemo(zId, addr, name, verified);
  };

  window.addEventListener("enterSignInMode", handleFlip);
  return () => window.removeEventListener("enterSignInMode", handleFlip);
}, []);


// ✅ Listen for card rotating back → switch to Draft mode automatically
useEffect(() => {
  const handleDraftMode = () => {
    setMode("note");
    setForceShowQR(false);
  };
  window.addEventListener("enterDraftMode", handleDraftMode);
  return () => window.removeEventListener("enterDraftMode", handleDraftMode);
}, []);

// ✅ When the selected profile changes (e.g., you click a different card in the directory),
// force the feedback form out of Verify mode and clear the previous memo/id.
// This guarantees you must click "Verify" again for the new profile.
useEffect(() => {
  if (!selectedAddress) return;
  if (mode === "signin") {
    setMode("note");
    setForceShowQR(false);
    setActiveZId(null);
    setSignInMemo(""); // clear stale {z:...}
  }
}, [selectedAddress]);

// ✅ Rebuild the sign-in memo whenever anything relevant changes, not only on edits
useEffect(() => {
  if (mode !== "signin") return;

  let zId = activeZId;
  let addr = selectedAddress;

  // fallback to event detail cache if missing
  if ((!zId || !addr) && window.lastZcashFlipDetail) {
    zId = window.lastZcashFlipDetail.zId;
    addr = window.lastZcashFlipDetail.address;
  }

  const memoText = buildZcashEditMemo(
    { ...(pendingEdits?.profile || {}), links: pendingEdits?.l || [] },
    zId ?? "?",
    addr
  );

  setSignInMemo(memoText);
}, [pendingEdits, mode, activeZId, selectedAddress]);

  useEffect(() => {
    if (showDraft && (memo.trim() || amount.trim())) {
      setShowEditLabel(true);
      const t = setTimeout(() => setShowEditLabel(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showDraft, memo, amount]);
useEffect(() => {
  if (mode !== "signin") return;

  let zId = activeZId;
  let addr = selectedAddress;

  if ((!zId || !addr) && window.lastZcashFlipDetail) {
    zId = window.lastZcashFlipDetail.zId;
    addr = window.lastZcashFlipDetail.address;
  }

  const memoText = buildZcashEditMemo(
    { ...(pendingEdits?.profile || {}), links: pendingEdits?.l || [] },
    zId ?? "?",
    addr
  );

  setSignInMemo(memoText);
}, [pendingEdits, mode, activeZId, selectedAddress]);


useEffect(() => {
  async function fetchProfiles() {
const { data, error } = await supabase
  .from("zcasher")
  .select(`
    id,
    name,
    address,
    address_verified,
    zcasher_links(is_verified),
    zcasher_items(is_verified, kind)
  `)
  .order("name", { ascending: true });

    if (error) {
      console.error("Error loading profiles in ZcashFeedback:", error);
    } else if (data) {
      setProfiles(data);
    }
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
  className="text-sm font-semibold text-white bg-blue-700/90 px-3 py-1 rounded-full shadow-md hover:bg-blue-600 transition-colors duration-300 whitespace-nowrap animate-editDraftInOut"
  style={{ backdropFilter: "blur(4px)" }}
>
  Edit Draft
  <style>{`
    @keyframes editDraftInOut {
      0%   { opacity: 0; transform: translateX(12px); }
      10%  { opacity: 1; transform: translateX(0); }
      80%  { opacity: 1; transform: translateX(0); }
      100% { opacity: 0; transform: translateX(120px); }
    }
    .animate-editDraftInOut {
      animation: editDraftInOut 4.5s ease-in-out forwards;
    }
  `}</style>
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
  {/* 🧭 Draft Button */}
  <button
    onClick={() => {
      setMode("note");
      setForceShowQR(false);
      // ✅ Tell the card to flip to FRONT
      window.dispatchEvent(new CustomEvent("enterDraftMode"));
    }}
    className={`px-3 py-1 font-medium transition-colors ${
      mode === "note"
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-600 hover:bg-gray-100"
    }`}
  >
    ✎ Draft
  </button>

{/* 🔐 Sign In Button */}
<button
  onClick={() => {
    setMode("signin");
    setForceShowQR(true);
    setShowFull(false);

    // ✅ Smoothly scroll this section into view
    setTimeout(() => {
      const feedbackSection = document.getElementById("zcash-feedback");
      if (feedbackSection) {
        feedbackSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);

    // ✅ Tell the card to flip to BACK (Edit Profile)
    const resolvedZId =
      activeZId ??
      cachedProfiles.find((p) => p.address === selectedAddress)?.id ??
      "?";

    window.dispatchEvent(
      new CustomEvent("enterSignInMode", {
        detail: {
          zId: resolvedZId,
          address: selectedAddress,
          name:
            cachedProfiles.find((p) => p.address === selectedAddress)?.name ||
            "",
          verified:
            cachedProfiles.find((p) => p.address === selectedAddress)
              ?.address_verified || false,
        },
      })
    );
  }}
  className={`px-3 py-1 font-medium transition-colors ${
    mode === "signin"
      ? "bg-blue-600 text-white"
      : "bg-gray-100 text-gray-600 hover:bg-gray-100"
  }`}
>
  ⛊ Verify
</button>
</div>

          </div>
        </div>
<div className="text-sm text-gray-700 mb-4 text-center">
  {mode === "signin" ? (
    <div></div>
  ) : (
    <>
      ✎ Draft a note to{" "}
<span className="font-semibold text-blue-700">
  {(() => {
const match = cachedProfiles.find((p) => p.address === selectedAddress);
const name = match?.name || "(unknown)";
return name;

  })()}
</span>
:

    </>
  )}
</div>


        {/* Form */}

        {/* Input section */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="w-full max-w-xl">
            {/* Recipient select */}
{/* Recipient */}
<div className="relative flex flex-col w-full">
  {mode === "signin" ? (
    <div className="border rounded-lg px-3 py-2 text-sm bg-transparent-50 text-gray-700">
<span className="font-semibold flex items-center justify-center gap-2 text-center w-full">
  Request One-Time Passcode
  <div className="relative group inline-block">
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-gray-500 text-[10px] font-bold hover:text-blue-600 hover:border-blue-600 cursor-pointer bg-transparent">
      ?
    </span>
    <div className="absolute right-0 top-5 hidden group-hover:block w-56 text-xs bg-white border border-gray-300 rounded-lg shadow-lg p-2 text-gray-700 z-50">
      You will receive four emojis in a message to your Zcash address.
    </div>
  </div>
</span>

    
      <div className="truncate text-gray-500 text-xs mt-1">
to verify address or approve changes
       </div>

    </div>
    
  ) : (
    <>
      {/* Searchable Recipient Input */}
<div className="relative">
  <input
    type="text"
    value={
      selectedAddress === "other"
        ? manualAddress
        : cachedProfiles.find((p) => p.address === selectedAddress)?.name || ""
    }
    onChange={(e) => {
      const input = e.target.value;
      // Detect “Other” case
      const match = profiles.find(
        (p) => p.name.toLowerCase() === input.toLowerCase()
      );
      if (match) setSelectedAddress(match.address);
      else {
        setSelectedAddress("other");
        setManualAddress(input);
      }
    }}
    placeholder="Search or enter a Zcash user"
    className="border rounded-lg px-3 py-2 text-sm w-full bg-transparent outline-none focus:border-blue-500"
    autoComplete="off"
  />

  {manualAddress && (
    <button
      onClick={() => {
        setManualAddress("");
        setSelectedAddress("");
      }}
      className="absolute right-3 top-2 text-gray-400 hover:text-red-500 text-sm font-semibold"
      aria-label="Clear recipient"
    >
      ⛌
    </button>
  )}

  {((!selectedAddress && manualAddress) || manualAddress.length > 0) && (
    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-black/30 bg-white shadow-lg">
     {cachedProfiles
  .filter((p) =>
    p.name.toLowerCase().includes(manualAddress.toLowerCase())
  )
  .slice(0, 20)
  .map((p) => (
<div
  key={p.address}
  onClick={() => {
    setSelectedAddress(p.address);
    setManualAddress("");
  }}
  className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center gap-2"
>
  <span>{p.name}</span>

{(p.address_verified ||
  p.zcasher_links?.some((l) => l.is_verified) ||
  p.zcasher_items?.some((i) => i.is_verified && i.kind === "address")) && (
  <VerifiedBadge
    verified
    compact
    verifiedCount={
      (p.address_verified ? 1 : 0) +
      ((p.zcasher_links?.filter((l) => l.is_verified).length) || 0) +
      ((p.zcasher_items?.filter((i) => i.is_verified && i.kind === "address").length) || 0)
    }
  />
)}


  <span className="text-gray-500 text-xs ml-auto font-mono">
    {p.address.length > 12
      ? `${p.address.slice(0, 6)}...${p.address.slice(-6)}`
      : p.address}
  </span>
</div>

  ))}
{!cachedProfiles.some((p) =>
  p.name.toLowerCase().includes(manualAddress.toLowerCase())
) && (
  <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
)}

{!cachedProfiles.some((p) =>
  p.name.toLowerCase().includes(manualAddress.toLowerCase())
) && (

        <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
      )}
    </div>
  )}
</div>

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
{mode === "signin" ? (
  // Read-only wallet-style memo preview
  <div className="relative group w-full">
    <pre
className="border border-gray-300 rounded-xl px-4 py-3 text-sm w-full bg-transparent text-gray-800 font-mono whitespace-pre-wrap break-words text-left shadow-sm backdrop-blur-sm"
  style={{ minHeight: "6rem" }}
>

      {signInMemo || "(waiting for edits…)"}
    </pre>



<p className="text-xs text-gray-400 mt-1 italic text-center">
  (Do not modify before sending! Include &gt;{MIN_SIGNIN_AMOUNT} ZEC)
</p>

  </div>
) : (
  // Regular editable draft mode
  <textarea
    rows={1}
    placeholder="Memo (optional)"
    value={draftMemo}
    onChange={(e) => {
      const el = e.target;
      setDraftMemo(el.value);
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }}
    disabled={
      (selectedAddress === "other"
        ? manualAddress?.startsWith("t")
        : selectedAddress?.startsWith("t")) || false
    }
    className={`border rounded-lg px-3 py-2 text-sm w-full resize-none overflow-hidden pr-8 pb-6 ${
      (selectedAddress === "other"
        ? manualAddress?.startsWith("t")
        : selectedAddress?.startsWith("t"))
        ? "bg-gray-300 text-gray-400 cursor-not-allowed"
        : ""
    }`}
  />
)}

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
                  <div className="absolute bottom-5 right-3 text-xs text-gray-400 pointer-events-none">
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
    <label className="block text-sm text-gray-700 mb-1">One-Time Passcode</label>
    <input
      type="text"
      placeholder="Enter the code you received"
      value={codeValue}
      onChange={(e) => setCodeValue(e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
    />
    <p className="text-xs text-gray-500 mt-1">The code is unique to you and your update.</p>
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
window.open(uri, "_blank");
setWalletOpened(true);
setTimeout(() => setWalletOpened(false), 1500);

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

