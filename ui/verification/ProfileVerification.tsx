import { useState, useCallback, useEffect, useRef } from "react";
import type { Profile } from "@/lib/profile/types";
import type { ProfileEditsPayload } from "@/lib/api/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import { OtpInput } from "@/ui/verification/OtpInput";
import { generateMemoAction } from "@/lib/verification/generateMemoAction";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import Alert from "@/ui/common/feedback/Alert";
import Button from "@/ui/common/buttons/Button";
import { useEditsStore } from "@/ui/profile/store";

const QR_AMOUNT_ZEC = "0.004";

interface ProfileVerificationProps {
  profile: Profile;
  generateQrTrigger?: number;
  onClose?: () => void;
}

export default function ProfileVerification({
  profile,
  generateQrTrigger = 0,
  onClose,
}: ProfileVerificationProps) {
  // Get edits from store
  const { form, original, deletedFields, pendingAvatarUpload, clearPendingAvatarUpload, updateField } = useEditsStore();

  // Build edits payload from store (only include changed fields)
  const buildEditsPayload = useCallback((): ProfileEditsPayload | undefined => {
    const edits: ProfileEditsPayload = {};
    let hasChanges = false;

    // Compare scalar fields
    if (form.name !== original.name) {
      edits.name = form.name;
      hasChanges = true;
    }
    if (form.display_name !== original.display_name) {
      edits.display_name = form.display_name;
      hasChanges = true;
    }
    if (form.bio !== original.bio) {
      edits.bio = form.bio;
      hasChanges = true;
    }
    if (deletedFields.profile_image_url) {
      edits.remove_profile_image = true;
      hasChanges = true;
    } else if (!pendingAvatarUpload && form.profile_image_url !== original.profile_image_url) {
      edits.profile_image_url = form.profile_image_url;
      hasChanges = true;
    }
    if (form.nearest_city_name !== original.nearest_city_name) {
      edits.nearest_city_name = form.nearest_city_name;
      hasChanges = true;
    }
    if (pendingAvatarUpload) {
      edits.avatar_upload = pendingAvatarUpload;
      hasChanges = true;
    }

    // Handle links - compare by id and url
    const activeFormLinkIds = new Set(form.links.filter((l) => !l._delete).map((l) => l.id));
    const linkEdits: ProfileEditsPayload["links"] = [];

    // Find deleted links (either removed from form or marked for deletion)
    for (const origLink of original.links) {
      const markedForDeletion = form.links.find((l) => l.id === origLink.id)?._delete === true;
      if (origLink.id && (!activeFormLinkIds.has(origLink.id) || markedForDeletion)) {
        linkEdits.push({ id: origLink.id, url: origLink.url, platform: origLink.platform, _delete: true });
      }
    }

    // Find new and updated links
    for (const formLink of form.links) {
      if (formLink._delete) {
        continue;
      }
      if (!formLink.id) {
        // New link
        linkEdits.push({ url: formLink.url, label: formLink.label, platform: formLink.platform });
      } else {
        // Check if updated
        const origLink = original.links.find((l) => l.id === formLink.id);
        if (origLink && (origLink.url !== formLink.url || origLink.label !== formLink.label)) {
          linkEdits.push({ id: formLink.id, url: formLink.url, label: formLink.label, platform: formLink.platform });
        }
      }
    }

    if (linkEdits.length > 0) {
      edits.links = linkEdits;
      hasChanges = true;
    }

    return hasChanges ? edits : undefined;
  }, [form, original, deletedFields.profile_image_url, pendingAvatarUpload]);

  // Local UI state
  const [qrVisible, setQrVisible] = useState(false);
  const [showOtpEntry, setShowOtpEntry] = useState(false);
  const [otp, setOtp] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [otpResult, setOtpResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Memo + URI returned from the server
  const [currentMemo, setCurrentMemo] = useState("");
  const [currentUri, setCurrentUri] = useState("");
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const lastGenerateTriggerRef = useRef(generateQrTrigger);

  // Generate QR - calls the server to create memo + URI
  const handleGenerateQr = useCallback(async () => {
    if (!profile?.id) return;

    setError("");
    setOtpResult(null);
    setOtp("");
    setShowOtpEntry(false);
    setOtpAttemptsLeft(5);
    setIsGenerating(true);

    try {
      const result = await generateMemoAction(profile.id, QR_AMOUNT_ZEC);

      if (result.ok && result.memo && result.uri) {
        setCurrentMemo(result.memo);
        setCurrentUri(result.uri);
        setQrVisible(true);
        setShowOtpEntry(false);
      } else {
        setError(result.error ?? "Failed to generate QR code.");
      }
    } catch {
      setError("Failed to generate QR code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!generateQrTrigger) return;
    if (lastGenerateTriggerRef.current === generateQrTrigger) return;

    lastGenerateTriggerRef.current = generateQrTrigger;
    void handleGenerateQr();
  }, [generateQrTrigger, handleGenerateQr]);

  // Handle OTP submission
  const handleSubmitOtp = useCallback(async () => {
    const otpValue = otp.trim();
    if (otpValue.length !== 6 || !profile.id || !currentMemo) return;

    if (otpAttemptsLeft <= 0) {
      setOtpResult({
        ok: false,
        message: "Too many attempts. Please generate a new QR code.",
      });
      return;
    }

    setIsSubmitting(true);
    setOtpResult(null);
    setError("");

    try {
      // Build edits payload from store
      const edits = buildEditsPayload();
      const response = await confirmOtpAction(profile.id, otpValue, currentMemo, edits);

      if (response.ok) {
        const responseData = response.data as Record<string, unknown> | undefined;
        const nextProfileImageUrl =
          typeof responseData?.profile_image_url === "string"
            ? responseData.profile_image_url
            : responseData?.profile_image_url === null
              ? ""
              : null;
        if (nextProfileImageUrl !== null) {
          updateField("profile_image_url", nextProfileImageUrl);
          clearPendingAvatarUpload();
        }
        const message = edits
          ? "Verification successful! Changes saved. Refreshing..."
          : "Verification successful! Refreshing...";
        setOtpResult({ ok: true, message });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const remaining = otpAttemptsLeft - 1;
        setOtpAttemptsLeft(remaining);
        setOtp("");

        if (remaining <= 0) {
          setOtpResult({
            ok: false,
            message: "Too many attempts. Please generate a new QR code.",
          });
          setShowOtpEntry(false);
          setQrVisible(false);
        } else {
          setOtpResult({
            ok: false,
            message: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
          });
        }
      }
    } catch {
      setOtpResult({ ok: false, message: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, profile.id, currentMemo, otpAttemptsLeft, buildEditsPayload, clearPendingAvatarUpload, updateField]);

  // Handle OTP input change - strip non-digits
  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const handleSentIt = useCallback(() => {
    setShowOtpEntry(true);
  }, []);
  const isOtpComplete = otp.trim().length === 6;

  const showQrSection = qrVisible && !!currentUri;
  const qrSectionClasses = showQrSection
    ? showOtpEntry
      ? "max-h-[1200px] opacity-100"
      : "mt-1 pt-1 max-h-[1200px] opacity-100"
    : "max-h-0 opacity-0";

  return (
    <div className="w-full bg-transparent border-none shadow-none p-0">
      {/* Error display (for memo generation errors) */}
      {error && !qrVisible && (
        <Alert variant="error" size="sm" message={error} className="mt-2" />
      )}

      {/* QR Code Display */}
      <div
        className={`w-full overflow-hidden transition-[max-height,opacity] duration-350 ease-out ${qrSectionClasses}`}
      >
        {!showOtpEntry && (
          <div className="flex justify-center mb-4">
            <QrUriBlock
              uri={currentUri}
              profileName="verification"
              qrTopHintText="Include 0.002 ZEC minimum"
              qrHintText="Scan or Tap QR"
              compactTopSpacing
            />
          </div>
        )}

        {!showOtpEntry && (
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={handleSentIt}
              disabled={isGenerating}
              className="w-full max-w-[300px] px-4 py-3 bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/90 text-white font-semibold rounded-xl text-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I Sent It!
            </button>
          </div>
        )}

        {showOtpEntry && (
          <div className="relative w-full max-w-[408px] mx-auto border border-black/10 rounded-xl p-5 bg-white/80">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-600">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Enter your 6-digit verification code
            </div>
            <p className="text-xs text-gray-500 mb-3">
              After sending the transaction, enter the code you receive in your wallet.
            </p>

            <div className="space-y-3">
              <OtpInput
                id="verification-otp"
                value={otp}
                onChange={handleOtpChange}
                onSubmit={handleSubmitOtp}
                placeholder="Enter 6-digit code"
                hideLabel={true}
                className="w-full"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                onClick={handleSubmitOtp}
                variant="primary"
                size="md"
                className="w-full border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)] text-white hover:border-[var(--color-brand-blue)]/90 hover:bg-[var(--color-brand-blue)]/90"
                disabled={!isOtpComplete || isSubmitting}
              >
                {isSubmitting ? "Verifying..." : "Verify Code"}
              </Button>
            </div>

            {/* Result message */}
            {otpResult && (
              <div
                className={`mt-3 text-sm font-semibold ${
                  otpResult.ok ? "text-green-700" : "text-red-600"
                }`}
              >
                {otpResult.message}
              </div>
            )}

            {/* Error display */}
            {error && (
              <Alert variant="error" size="sm" message={error} className="mt-2" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
