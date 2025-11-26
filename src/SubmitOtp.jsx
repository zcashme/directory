import { useRef, useState } from "react";
import ReactDOM from "react-dom";
import { supabase } from "./supabase";


function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// helper to shorten addresses (first6...last6)
function shortAddr(a = "") {
  if (a.length < 14) return a;
  return a.slice(0, 6) + "..." + a.slice(-6);
}

export default function SubmitOtp({ isOpen, onClose, profile }) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState(0);       // 0 = enter OTP, 1 = checking, 2 = done
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState(null); // "ok" or "fail"
  const [customMessage, setCustomMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  

  if (!isOpen) return null;

  const pname = profile?.name || "Profile";
  const paddr = profile?.address || "(unknown)";

  // ─────────────────────────────────────────────
  // NEW: Call SQL RPC instead of HTTP backend
  // ─────────────────────────────────────────────
  async function handleSubmit() {
    setStep(1);

    try {
      const zid = profile?.id;

const { data, error } = await supabase.rpc("confirm_otp_sql", {
  in_zcasher_id: zid,
  in_otp: otp,
});


      if (error) {
        console.error("RPC error:", error);
        setResult("fail");
        setCustomMessage("Unexpected server error.");
        setStep(2);
        return;
      }

      let message = "";
      const status = data?.status;

      switch (status) {
        case "verified":
          setResult("ok");
          message = "Your profile has been updated. Close to refresh the page.";
          break;

        case "verified_and_no_pending_edits":
          setResult("ok");
          message = "Your address is verified, but there were no changes to apply.";
          break;

        case "invalid":
          setResult("fail");
          message = "Incorrect code. Please try again.";
          break;

        case "locked":
          setResult("fail");
          message = "Too many failed attempts. This OTP is now locked.";
          break;

        case "expired":
          setResult("fail");
          message = "This OTP has expired. Request a new one.";
          break;

        case "otp_already_used":
          setResult("fail");
          message = "This OTP was already used. Generate a new one.";
          break;

        default:
          setResult("fail");
          message = "Unexpected response from server.";
          break;
      }

      setCustomMessage(message);
      setStep(2);

    } catch (err) {
      console.error("OTP request failed:", err);
      setResult("fail");
      setCustomMessage("Unexpected error.");
      setStep(2);
    }
  }

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center
                 pt-[10vh] sm:pt-0 overflow-y-auto"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl
                   shadow-xl border border-black/30 animate-fadeIn"
      >

        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-lg font-semibold text-gray-800">Paste your OTP</h2>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Slide 0: OTP entry */}
        {step === 0 && (
          <div className="px-5 py-4 space-y-4">
            <div className="text-sm text-gray-700 leading-relaxed">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <div><strong>Name:</strong> {pname}</div>
                <div className="break-all">
                  <strong>Address:</strong> {shortAddr(paddr)}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="otp"
                className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1"
              >
                One-time passcode (OTP)
              </label>

              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D+/g, "");
                  setOtp(onlyDigits);
                }}
                placeholder="Paste your OTP"
                className="w-full rounded-xl border border-black/30 px-3 py-2 text-sm
                           outline-none focus:border-blue-600 bg-white"
              />
            </div>
          </div>
        )}

        {/* Slide 1: Checking */}
        {step === 1 && (
          <div className="px-5 py-10 text-center text-gray-700">
            <div className="animate-pulse text-lg font-semibold">Checking your code...</div>
            <p className="mt-2 text-sm">Please wait</p>
          </div>
        )}

        {/* Slide 2: Result */}
        {step === 2 && (
          <div className="px-5 py-10 text-center text-gray-700">
            {result === "ok" ? (
              <>
                <div className="text-green-600 text-xl font-semibold">Success</div>
                <p className="mt-2 text-sm">{customMessage}</p>
              </>
            ) : (
              <>
                <div className="text-red-600 text-xl font-semibold">Authentication Failed</div>
                <p className="mt-2 text-sm">{customMessage}</p>
              </>
            )}
          </div>
        )}

        {showHelp && step === 0 && (
          <p className="mx-5 mt-2 mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 pt-2 leading-snug">
            After sending your authentication request, receive an OTP within 24 hours.
            Submit that OTP here to approve your changes.
            If the OTPs match, your card is updated accordingly.
          </p>
        )}

        {showHelp && step === 2 && (
          <p className="mx-5 mt-2 mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 pt-2 leading-snug">
            Your code did not match the records.
            Make sure you entered the most recent OTP you received.
          </p>
        )}

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-black/10">

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs font-semibold text-blue-600 underline"
          >
            {showHelp ? "Hide help" : "Help"}
          </button>

          <div className="flex items-center gap-3">
            {step === 0 && (
              <>
                <button
                  onClick={onClose}
                  className="py-2.5 px-5 rounded-xl border border-black/30 text-sm
                             font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  className="py-2.5 px-5 rounded-xl border border-black/30 text-sm font-semibold
                             text-blue-700 hover:border-blue-600 hover:bg-blue-50"
                >
                  Submit OTP
                </button>
              </>
            )}

            {step === 2 && result === "ok" && (
              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="py-2.5 px-5 rounded-xl border border-black/30 text-sm font-semibold
                           text-green-700 hover:border-green-600 hover:bg-green-50"
              >
                Close
              </button>
            )}

            {step === 2 && result !== "ok" && (
              <button
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl border border-black/30 text-sm font-semibold
                           text-blue-700 hover:border-blue-600 hover:bg-blue-50"
              >
                Close
              </button>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn .25s ease-out; }
      `}</style>
    </div>,
    document.body
  );
}
