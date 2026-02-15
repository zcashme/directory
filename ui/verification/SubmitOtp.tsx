"use client";

import { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import type { Profile } from "@/lib/profile/types";
import { OtpInput } from "./OtpInput";
import Button from "@/ui/common/buttons/Button";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function shortAddr(a = "") {
  if (a.length < 14) return a;
  return a.slice(0, 6) + "..." + a.slice(-6);
}

type Step = "entry" | "checking" | "result";

interface SubmitOtpProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Partial<Profile>;
}

export default function SubmitOtp({ isOpen, onClose, profile }: SubmitOtpProps) {
  const [step, setStep] = useState<Step>("entry");
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const handleSubmit = useCallback(async () => {
    const zid = profile?.id;
    if (!zid || !otp.trim()) return;

    setStep("checking");

    try {
      // Call confirmOtpAction - it will find the matching session
      const response = await confirmOtpAction(zid, otp.trim());

      if (response.ok) {
        setResult({ ok: true, message: "Verification successful! Your profile has been updated." });
      } else {
        setResult({ ok: false, message: response.error || "Verification failed." });
      }
      setStep("result");
    } catch {
      setResult({ ok: false, message: "An error occurred. Please try again." });
      setStep("result");
    }
  }, [profile?.id, otp]);

  const handleReset = useCallback(() => {
    setStep("entry");
    setOtp("");
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleSuccessClose = useCallback(() => {
    onClose();
    window.location.reload();
  }, [onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const pname = profile?.name ?? "Profile";
  const paddr = profile?.address ?? "(unknown)";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center pt-[10vh] sm:pt-0 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-lg font-semibold text-gray-800">Enter Verification Code</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {step === "entry" && (
          <div className="px-5 py-4 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <div><strong>Name:</strong> {pname}</div>
              <div className="break-all"><strong>Address:</strong> {shortAddr(paddr)}</div>
            </div>

            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your verification transaction.
            </p>

            <OtpInput
              value={otp}
              onChange={handleOtpChange}
              onSubmit={handleSubmit}
              id="otp-modal"
              label="Verification Code"
              placeholder="Enter 6-digit code"
            />
          </div>
        )}

        {step === "checking" && (
          <div className="px-5 py-10 text-center text-gray-700">
            <div className="animate-pulse text-lg font-semibold">Verifying...</div>
            <p className="mt-2 text-sm">Please wait</p>
          </div>
        )}

        {step === "result" && result && (
          <div className="px-5 py-10 text-center">
            {result.ok ? (
              <>
                <div className="text-green-600 text-xl font-semibold">Success</div>
                <p className="mt-2 text-sm text-gray-700">{result.message}</p>
              </>
            ) : (
              <>
                <div className="text-red-600 text-xl font-semibold">Failed</div>
                <p className="mt-2 text-sm text-gray-700">{result.message}</p>
              </>
            )}
          </div>
        )}

        {showHelp && step === "entry" && (
          <p className="mx-5 mb-3 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-snug">
            After sending your verification transaction, you received a 6-digit code.
            Enter it here to apply your pending profile changes.
            Codes expire after 24 hours.
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
            {step === "entry" && (
              <>
                <Button onClick={handleClose} variant="secondary" size="lg">Cancel</Button>
                <Button onClick={handleSubmit} disabled={!otp.trim()} variant="primary" size="lg">
                  Verify
                </Button>
              </>
            )}

            {step === "result" && result?.ok && (
              <Button onClick={handleSuccessClose} variant="primary" size="lg">
                Close
              </Button>
            )}

            {step === "result" && !result?.ok && (
              <>
                <Button onClick={handleReset} variant="secondary" size="lg">Try Again</Button>
                <Button onClick={handleClose} variant="primary" size="lg">Close</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
