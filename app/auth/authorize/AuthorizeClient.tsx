"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { OtpInput } from "@/ui/verification/OtpInput";
import { OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";
import { generateAuthMemoAction, confirmAuthOtpAction } from "@/lib/auth/actions";

interface AuthorizeClientProps {
  sessionId: string;
  appName: string;
}

type Step = "identify" | "payment" | "verifying" | "redirecting" | "success" | "error";

export default function AuthorizeClient({ sessionId, appName }: AuthorizeClientProps) {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("identify");

  // Name/address input
  const [nameOrAddress, setNameOrAddress] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolvedPicture, setResolvedPicture] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // QR state
  const [qrUri, setQrUri] = useState("");
  const [memo, setMemo] = useState("");
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // OTP state
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);

  // ── Step 1: Resolve name/address ─────────────────────────────

  const handleIdentify = useCallback(async () => {
    const input = nameOrAddress.trim();
    if (!input) return;

    setIsResolving(true);
    setResolveError("");

    try {
      // If it looks like a Zcash address (starts with u1, z1, t1), use it directly
      if (/^(u1|z|t1)/.test(input)) {
        setResolvedAddress(input);
        setResolvedName(null);
        setResolvedPicture(null);
        setStep("payment");
        return;
      }

      // Otherwise, resolve via ZNS
      const res = await fetch(`/api/resolve/${encodeURIComponent(input)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Name not found");
      }

      const data = await res.json();
      if (!data.address) {
        throw new Error("No address found for this name.");
      }

      setResolvedAddress(data.address);
      setResolvedName(data.name || data.display_name || input);
      setResolvedPicture(data.profile_image_url || null);
      setStep("payment");
    } catch (e) {
      setResolveError(e instanceof Error ? e.message : "Failed to resolve name.");
    } finally {
      setIsResolving(false);
    }
  }, [nameOrAddress]);

  // ── Step 2: Generate QR code ─────────────────────────────────

  useEffect(() => {
    if (step !== "payment" || !resolvedAddress) return;

    let cancelled = false;
    setIsGeneratingQr(true);
    setError("");

    (async () => {
      try {
        const result = await generateAuthMemoAction(sessionId, resolvedAddress);
        if (cancelled) return;

        if (result.ok && result.memo && result.uri) {
          setMemo(result.memo);
          setQrUri(result.uri);
        } else {
          setError(result.error ?? "Failed to generate payment request.");
        }
      } catch {
        if (!cancelled) setError("Failed to generate payment request.");
      } finally {
        if (!cancelled) setIsGeneratingQr(false);
      }
    })();

    return () => { cancelled = true; };
  }, [step, resolvedAddress, sessionId]);

  // ── Step 3: Verify OTP ───────────────────────────────────────

  const handleVerifyOtp = useCallback(async () => {
    const otpValue = otp.trim();
    if (otpValue.length !== 6 || !memo) return;

    if (otpAttemptsLeft <= 0) {
      setError("Too many attempts. Please generate a new QR code.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await confirmAuthOtpAction(
        sessionId,
        otpValue,
        memo,
        resolvedName ?? undefined,
        resolvedPicture ?? undefined,
      );

      if (result.ok && result.redirectUrl) {
        setStep("redirecting");
        // Redirect back to the developer's app
        window.location.href = result.redirectUrl;
      } else {
        const remaining = otpAttemptsLeft - 1;
        setOtpAttemptsLeft(remaining);
        setOtp("");

        if (remaining <= 0) {
          setError("Too many attempts. Please generate a new QR code.");
        } else {
          setError(`Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, memo, sessionId, otpAttemptsLeft, resolvedName, resolvedPicture]);

  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const isOtpComplete = otp.trim().length === 6;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sign in to {appName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          with Zcash
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-6">

        {/* Step 1: Identify */}
        {step === "identify" && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="zcash-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Your Zcash name or address
              </label>
              <input
                id="zcash-name"
                type="text"
                value={nameOrAddress}
                onChange={(e) => setNameOrAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleIdentify();
                }}
                placeholder="alice.zcash or u1qqlzrf9..."
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-3 text-sm focus:border-[var(--color-brand-blue)] focus:ring-1 focus:ring-[var(--color-brand-blue)] focus:outline-none"
                autoFocus
              />
            </div>

            {resolveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{resolveError}</p>
            )}

            <button
              type="button"
              onClick={handleIdentify}
              disabled={!nameOrAddress.trim() || isResolving}
              className={`${OUTLINE_ACTION_BUTTON_CLASSES} w-full justify-center px-4 py-3 bg-[var(--color-brand-blue)] border-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-blue)]/90 hover:border-[var(--color-brand-blue)]/90 hover:!text-white active:!text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isResolving ? "Resolving..." : "Continue"}
            </button>
          </div>
        )}

        {/* Step 2: Payment + OTP */}
        {step === "payment" && (
          <div className="space-y-4">
            {/* Resolved identity preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              {resolvedPicture ? (
                <img
                  src={resolvedPicture}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-sm font-medium">
                  {(resolvedName ?? resolvedAddress).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {resolvedName ?? "Unknown"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                  {resolvedAddress.slice(0, 20)}...{resolvedAddress.slice(-6)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("identify");
                  setQrUri("");
                  setMemo("");
                  setOtp("");
                  setError("");
                }}
                className="text-xs text-gray-500 hover:text-[var(--color-brand-blue)]"
              >
                Change
              </button>
            </div>

            {/* QR Code */}
            {isGeneratingQr && (
              <div className="flex justify-center py-8">
                <div className="animate-pulse text-sm text-gray-500">
                  Generating payment request...
                </div>
              </div>
            )}

            {!isGeneratingQr && qrUri && (
              <>
                <div className="flex justify-center">
                  <a
                    href={qrUri}
                    className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] focus-visible:ring-offset-2"
                    title="Open in wallet"
                    aria-label="Open payment in wallet"
                  >
                    <QRCodeSVG
                      value={qrUri}
                      size={240}
                      includeMargin={true}
                      bgColor="transparent"
                      fgColor="#000000"
                      style={{ width: "min(240px, 100%)", height: "auto" }}
                    />
                  </a>
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--color-brand-blue)]">
                    Send payment to receive a code
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Include a minimum of 0.002 ZEC.
                    <br />
                    Do not leave the page before entering the code.
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-800" />

                {/* OTP Input */}
                <div className="space-y-3">
                  <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                    Enter the code from your wallet:
                  </p>
                  <OtpInput
                    id="auth-otp"
                    value={otp}
                    onChange={handleOtpChange}
                    onSubmit={handleVerifyOtp}
                    placeholder="Enter 6-digit code"
                    hideLabel={true}
                    className="w-full"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className={`${OUTLINE_ACTION_BUTTON_CLASSES} w-full justify-center px-4 py-3 bg-[var(--color-brand-blue)] border-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-blue)]/90 hover:border-[var(--color-brand-blue)]/90 hover:!text-white active:!text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={!isOtpComplete || isSubmitting}
                  >
                    {isSubmitting ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            )}
          </div>
        )}

        {/* Step: Redirecting */}
        {step === "redirecting" && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[var(--color-brand-blue)] mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Verified! Redirecting you back to {appName}...
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
        Powered by{" "}
        <a
          href="https://zcash.me"
          className="text-[var(--color-brand-blue)] hover:underline"
        >
          ZcashMe
        </a>
      </p>
    </div>
  );
}