"use client";

import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import type { Profile } from "@/lib/profile/types";
import { useOtpFlow, OtpStep } from "./useOtpFlow";
import { OtpInput } from "./OtpInput";
import { Button } from "@/ui/common";

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
  const [showHelp, setShowHelp] = useState(false);

  const otpFlow = useOtpFlow(confirmOtpAction, {
    onSuccess: () => {
      // Success callback - could trigger refresh or other actions
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      otpFlow.reset();
      setShowHelp(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle OTP submission
  async function handleSubmit() {
    const zid = profile?.id;
    if (!zid) {
      return;
    }
    await otpFlow.submit(zid);
  }

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
        {otpFlow.step === OtpStep.ENTRY && (
          <div className="px-5 py-4 space-y-4">
            <div className="text-sm text-gray-700 leading-relaxed">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <div><strong>Name:</strong> {pname}</div>
                <div className="break-all">
                  <strong>Address:</strong> {shortAddr(paddr)}
                </div>
              </div>
            </div>

            <OtpInput
              value={otpFlow.otp}
              onChange={otpFlow.setOtp}
              onSubmit={handleSubmit}
              id="otp"
              label="One-time passcode (OTP)"
              placeholder="Paste your OTP"
            />
          </div>
        )}

        {/* Slide 1: Checking */}
        {otpFlow.step === OtpStep.CHECKING && (
          <div className="px-5 py-10 text-center text-gray-700">
            <div className="animate-pulse text-lg font-semibold">Checking your code...</div>
            <p className="mt-2 text-sm">Please wait</p>
          </div>
        )}

        {/* Slide 2: Result */}
        {otpFlow.step === OtpStep.RESULT && (
          <div className="px-5 py-10 text-center text-gray-700">
            {otpFlow.status === "ok" ? (
              <>
                <div className="text-green-600 text-xl font-semibold">Success</div>
                <p className="mt-2 text-sm">{otpFlow.message}</p>
              </>
            ) : (
              <>
                <div className="text-red-600 text-xl font-semibold">Authentication Failed</div>
                <p className="mt-2 text-sm">{otpFlow.message}</p>
              </>
            )}
          </div>
        )}

        {showHelp && otpFlow.step === OtpStep.ENTRY && (
          <p className="mx-5 mt-2 mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 pt-2 leading-snug">
            After sending your authentication request, receive an OTP within 24 hours.
            Submit that OTP here to approve your changes.
            If the OTPs match, your card is updated accordingly.
          </p>
        )}

        {showHelp && otpFlow.step === OtpStep.RESULT && (
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
            {otpFlow.step === OtpStep.ENTRY && (
              <>
                <Button
                  onClick={onClose}
                  variant="secondary"
                  size="lg"
                >
                  Cancel
                </Button>

                <Button
                  onClick={() => {
                    void handleSubmit();
                  }}
                  disabled={!otpFlow.otp.trim()}
                  variant="primary"
                  size="lg"
                >
                  Submit OTP
                </Button>
              </>
            )}

            {otpFlow.step === OtpStep.RESULT && otpFlow.status === "ok" && (
              <Button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                variant="primary"
                size="lg"
                className="text-green-700 hover:border-green-600 hover:bg-green-50"
              >
                Close
              </Button>
            )}

            {otpFlow.step === OtpStep.RESULT && otpFlow.status !== "ok" && (
              <Button
                onClick={onClose}
                variant="primary"
                size="lg"
              >
                Close
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
