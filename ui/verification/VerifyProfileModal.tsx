"use client";

import { useState, useCallback } from "react";
import ReactDOM from "react-dom";
import type { Profile } from "@/lib/profile/types";
import ProfileVerification from "./ProfileVerification";
import { OtpInput } from "./OtpInput";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import Button from "@/ui/common/buttons/Button";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

type Tab = "verify" | "otp";
type OtpStep = "entry" | "checking" | "result";

interface VerifyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Partial<Profile>;
}

export default function VerifyProfileModal({ isOpen, onClose, profile }: VerifyProfileModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("verify");

  // OTP entry state (for "I have a code" flow)
  const [otpStep, setOtpStep] = useState<OtpStep>("entry");
  const [otp, setOtp] = useState("");
  const [otpResult, setOtpResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const handleSubmitOtp = useCallback(async () => {
    const zid = profile?.id;
    if (!zid || !otp.trim()) return;

    setOtpStep("checking");

    try {
      const response = await confirmOtpAction(zid, otp.trim());

      if (response.ok) {
        setOtpResult({ ok: true, message: "Verification successful! Your profile has been updated." });
      } else {
        setOtpResult({ ok: false, message: response.error || "Verification failed." });
      }
      setOtpStep("result");
    } catch {
      setOtpResult({ ok: false, message: "An error occurred. Please try again." });
      setOtpStep("result");
    }
  }, [profile?.id, otp]);

  const handleOtpReset = useCallback(() => {
    setOtpStep("entry");
    setOtp("");
    setOtpResult(null);
  }, []);

  const handleClose = useCallback(() => {
    handleOtpReset();
    setActiveTab("verify");
    onClose();
  }, [handleOtpReset, onClose]);

  const handleSuccessClose = useCallback(() => {
    onClose();
    window.location.reload();
  }, [onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center pt-[10vh] sm:pt-0 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-in fade-in zoom-in-95 duration-200 my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-lg font-semibold text-gray-800">Verify Profile</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-black/10">
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "verify"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Start Verification
          </button>
          <button
            onClick={() => setActiveTab("otp")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "otp"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            I Have a Code
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {activeTab === "verify" && profile && (
            <ProfileVerification profile={profile as Profile} />
          )}

          {activeTab === "otp" && (
            <>
              {otpStep === "entry" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code from an existing verification transaction.
                  </p>

                  <OtpInput
                    value={otp}
                    onChange={handleOtpChange}
                    onSubmit={handleSubmitOtp}
                    id="otp-modal"
                    label="Verification Code"
                    placeholder="Enter 6-digit code"
                  />

                  <div className="flex justify-end gap-3 pt-2">
                    <Button onClick={handleClose} variant="secondary" size="lg">
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitOtp} disabled={!otp.trim()} variant="primary" size="lg">
                      Verify
                    </Button>
                  </div>
                </div>
              )}

              {otpStep === "checking" && (
                <div className="py-10 text-center text-gray-700">
                  <div className="animate-pulse text-lg font-semibold">Verifying...</div>
                  <p className="mt-2 text-sm">Please wait</p>
                </div>
              )}

              {otpStep === "result" && otpResult && (
                <div className="py-10 text-center">
                  {otpResult.ok ? (
                    <>
                      <div className="text-green-600 text-xl font-semibold">Success</div>
                      <p className="mt-2 text-sm text-gray-700">{otpResult.message}</p>
                      <div className="mt-4">
                        <Button onClick={handleSuccessClose} variant="primary" size="lg">
                          Close
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-red-600 text-xl font-semibold">Failed</div>
                      <p className="mt-2 text-sm text-gray-700">{otpResult.message}</p>
                      <div className="mt-4 flex justify-center gap-3">
                        <Button onClick={handleOtpReset} variant="secondary" size="lg">
                          Try Again
                        </Button>
                        <Button onClick={handleClose} variant="primary" size="lg">
                          Close
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
