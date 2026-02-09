"use client";

import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import type { Profile } from "@/lib/profile/types";

// Constants
const STEPS = {
  ENTRY: 0,
  CHECKING: 1,
  RESULT: 2,
} as const;

type Step = typeof STEPS[keyof typeof STEPS];
type ResultType = "ok" | "fail";

const OTP_MESSAGES: Record<string, { type: ResultType; text: string }> = {
  verified: {
    type: "ok",
    text: "Your profile has been updated. Close to refresh the page.",
  },
  verified_and_no_pending_edits: {
    type: "ok",
    text: "Your address is verified, but there were no changes to apply.",
  },
  invalid: {
    type: "fail",
    text: "Incorrect code. Please try again.",
  },
  locked: {
    type: "fail",
    text: "Too many failed attempts. This OTP is now locked.",
  },
  expired: {
    type: "fail",
    text: "This OTP has expired. Request a new one.",
  },
  otp_already_used: {
    type: "fail",
    text: "This OTP was already used. Generate a new one.",
  },
};

// Helper Components
interface XIconProps {
  className?: string;
}

function XIcon(props: XIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function shortAddr(a = "") {
  if (a.length < 14) return a;
  return a.slice(0, 6) + "..." + a.slice(-6);
}

interface SubmitOtpProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Partial<Profile>;
}

export default function SubmitOtp({ isOpen, onClose, profile }: SubmitOtpProps) {
  const [step, setStep] = useState<Step>(STEPS.ENTRY);
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState<ResultType | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(STEPS.ENTRY);
      setOtp("");
      setResult(null);
      setCustomMessage("");
      setShowHelp(false);
    }
  }, [isOpen]);


  // Helper to show result screen
  const showResult = (type: ResultType, message: string) => {
    setResult(type);
    setCustomMessage(message);
    setStep(STEPS.RESULT);
  };

  // Handle OTP submission
  async function handleSubmit() {
    setStep(STEPS.CHECKING);

    const zid = profile?.id;
    if (!zid) {
      showResult("fail", "Profile ID is missing");
      return;
    }

    try {
      const response = await confirmOtpAction(zid, otp.trim());

      if (!response.ok) {
        showResult("fail", response.error || "Unexpected server error.");
        return;
      }

      const status = response.data?.status;
      const statusInfo = status ? OTP_MESSAGES[status] : null;

      if (statusInfo) {
        showResult(statusInfo.type, statusInfo.text);
      } else {
        showResult("fail", "Unexpected response from server.");
      }
    } catch {
      showResult("fail", "Unexpected error.");
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === STEPS.ENTRY && otp.trim()) {
      void handleSubmit();
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const pname = profile?.name ?? "Profile";
  const paddr = profile?.address ?? "(unknown)";

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center
                 pt-[10vh] sm:pt-0 overflow-y-auto"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl
                   shadow-xl border border-black/30 animate-in fade-in zoom-in-95 duration-200"
        onKeyPress={handleKeyPress}
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
        {step === STEPS.ENTRY && (
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
                           outline-hidden focus:border-blue-600 bg-white"
              />
            </div>
          </div>
        )}

        {/* Slide 1: Checking */}
        {step === STEPS.CHECKING && (
          <div className="px-5 py-10 text-center text-gray-700">
            <div className="animate-pulse text-lg font-semibold">Checking your code...</div>
            <p className="mt-2 text-sm">Please wait</p>
          </div>
        )}

        {/* Slide 2: Result */}
        {step === STEPS.RESULT && (
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

        {showHelp && step === STEPS.ENTRY && (
          <p className="mx-5 mt-2 mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 pt-2 leading-snug">
            After sending your authentication request, receive an OTP within 24 hours.
            Submit that OTP here to approve your changes.
            If the OTPs match, your card is updated accordingly.
          </p>
        )}

        {showHelp && step === STEPS.RESULT && (
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
            {step === STEPS.ENTRY && (
              <>
                <button
                  onClick={onClose}
                  className="py-2.5 px-5 rounded-xl border border-black/30 text-sm
                             font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={!otp.trim()}
                  className="py-2.5 px-5 rounded-xl border border-black/30 text-sm font-semibold
                             text-blue-700 hover:border-blue-600 hover:bg-blue-50
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit OTP
                </button>
              </>
            )}

            {step === STEPS.RESULT && result === "ok" && (
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

            {step === STEPS.RESULT && result !== "ok" && (
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
    </div>,
    document.body
  );
}
