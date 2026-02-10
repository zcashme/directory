"use client";

import { useState, useEffect } from "react";
import { useThreadStore } from "@/lib/stores/thread";
import { confirmThreadOtpAction } from "@/lib/thread/actions";
import ProgressStep from "@/ui/verification/ProgressStep";
import HelpMessage from "@/ui/verification/HelpMessage";

interface ThreadOtpFlowProps {
  zcasherId: number;
  onSuccess?: () => void;
}

export default function ThreadOtpFlow({ zcasherId, onSuccess }: ThreadOtpFlowProps) {
  const { pollStatus, pollOtpPhase, isPolling, setIsPolling } = useThreadStore();

  const [step, setStep] = useState<"waiting" | "enter_otp" | "confirming" | "success" | "error">(
    "waiting"
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine current step based on polling status
  useEffect(() => {
    if (pollStatus === "error" || pollStatus === "timeout") {
      setStep("error");
      setError(pollStatus === "error" ? "Transaction not detected" : "Request timed out");
    } else if (pollStatus === "memo_detected" || pollOtpPhase === "memo_received") {
      setStep("enter_otp");
    } else if (pollStatus === "confirmed") {
      setStep("success");
      setSuccessMessage("Message posted successfully!");
    }
  }, [pollStatus, pollOtpPhase]);

  const handleSubmitOtp = async () => {
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    setStep("confirming");
    setError(null);

    try {
      const result = await confirmThreadOtpAction(zcasherId, otp.trim());

      if (result.status === "confirmed") {
        setStep("success");
        setSuccessMessage(result.message);
        setOtp("");

        // Call success callback
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else if (result.status === "expired") {
        setStep("error");
        setError("OTP has expired. Please try again.");
      } else if (result.status === "invalid") {
        setError("Invalid OTP. Please try again.");
        setStep("enter_otp");
        setOtp("");
      } else {
        setStep("error");
        setError(result.message || "Verification failed. Please try again.");
      }
    } catch (err) {
      console.error("Error confirming OTP:", err);
      setStep("error");
      setError("An unexpected error occurred");
    }
  };

  const handleRetry = () => {
    setStep("waiting");
    setOtp("");
    setError(null);
    setSuccessMessage(null);
    setIsPolling(true);
  };

  // Waiting for signature
  if (step === "waiting") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-500 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-blue-900">Waiting for transaction...</p>
            <p className="text-sm text-blue-800">Please sign and send the transaction from your wallet</p>
          </div>
        </div>

        <ProgressStep
          label="Transaction detected"
          isCurrent={false}
          showCheckmark={false}
        />

        <HelpMessage>
          Your wallet should still be open. If not, click "Open Wallet" to continue.
        </HelpMessage>
      </div>
    );
  }

  // Enter OTP
  if (step === "enter_otp") {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ Transaction detected! Check your wallet for the OTP code.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Enter OTP from wallet
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Enter 6-digit code"
            className={`w-full px-4 py-3 border rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 transition-all ${
              error
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500 focus:border-blue-300"
            }`}
            maxLength={6}
            autoComplete="off"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmitOtp}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
        >
          Confirm OTP
        </button>
      </div>
    );
  }

  // Confirming
  if (step === "confirming") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-blue-500 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="font-semibold text-gray-900">Verifying OTP...</p>
        </div>
      </div>
    );
  }

  // Success
  if (step === "success") {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
            </svg>
          </div>
          <p className="font-semibold text-green-900 text-lg mb-1">Success!</p>
          <p className="text-green-800 mb-4">{successMessage}</p>
          <p className="text-xs text-green-700">Your message has been posted to the thread.</p>
        </div>
      </div>
    );
  }

  // Error
  if (step === "error") {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-900 mb-1">Verification Failed</p>
          <p className="text-sm text-red-800 mb-4">{error}</p>
        </div>

        <button
          onClick={handleRetry}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}
