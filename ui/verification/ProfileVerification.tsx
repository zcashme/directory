import { useState, useCallback, useEffect, useRef } from "react";
import type { Profile } from "@/lib/profile/types";
import type { ProfileEditsPayload } from "@/lib/api/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import { OtpInput } from "@/ui/verification/OtpInput";
import { generateMemoAction } from "@/lib/verification/generateMemoAction";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import Alert from "@/ui/common/feedback/Alert";
import Button from "@/ui/common/buttons/Button";
import { OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";
import { useEditsStore } from "@/ui/profile/store";

const QR_AMOUNT_ZEC = "0.004";

interface ProfileVerificationProps {
  profile: Profile;
  generateQrTrigger?: number;
}

export default function ProfileVerification({
  profile,
  generateQrTrigger = 0,
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
  const lastGenerateTriggerRef = useRef(generateQrTrigger);

  // Generate QR - calls the server to create memo + URI
  const handleGenerateQr = useCallback(async () => {
    if (!profile?.id) return;

    setError("");
    setOtpResult(null);
    setOtp("");
    setShowOtpEntry(false);
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
    if (!otp.trim() || !profile.id || !currentMemo) return;

    setIsSubmitting(true);
    setOtpResult(null);
    setError("");

    try {
      // Build edits payload from store
      const edits = buildEditsPayload();
      const response = await confirmOtpAction(profile.id, otp.trim(), currentMemo, edits);

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
        // Check if the memo was exhausted and a new one was issued
        const data = response.data as Record<string, unknown> | undefined;
        if (data?.status === "exhausted" && data.newMemo && data.newUri) {
          setCurrentMemo(data.newMemo as string);
          setCurrentUri(data.newUri as string);
          setOtp("");
          setShowOtpEntry(false);
        }

        setOtpResult({
          ok: false,
          message: response.error || "Invalid verification code.",
        });
      }
    } catch {
      setOtpResult({ ok: false, message: "An error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }, [otp, profile.id, currentMemo, buildEditsPayload, clearPendingAvatarUpload, updateField]);

  // Handle OTP input change - strip non-digits
  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const handleSentIt = useCallback(() => {
    setShowOtpEntry(true);
  }, []);

  const showQrSection = qrVisible && !!currentUri;

  return (
    <div className="bg-transparent border-none shadow-none p-0 mt-1">
      {/* Error display (for memo generation errors) */}
      {error && !qrVisible && (
        <Alert variant="error" size="sm" message={error} className="mt-2" />
      )}

      {/* QR Code Display */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-350 ease-out ${
          showQrSection ? "mt-1 pt-1 max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {!showOtpEntry && (
          <div className="mt-1 mb-2">
            <Alert
              variant="warning"
              size="sm"
              message="Include minimum of 0.002 ZEC. Do not modify memo"
              className="text-center"
            />
          </div>
        )}

        {!showOtpEntry && (
          <div className="flex justify-center mb-4">
            <QrUriBlock
              uri={currentUri}
              profileName="verification"
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
              className={`${OUTLINE_ACTION_BUTTON_CLASSES} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              I Sent It!
            </button>
          </div>
        )}

        {showOtpEntry && (
          <div className="mt-2 border border-black/10 rounded-xl p-4 bg-white/80">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Enter your 6-digit verification code
            </div>
            <p className="text-xs text-gray-500 mb-3">
              After sending the transaction, enter the code you receive in your wallet.
            </p>

            <div className="flex gap-2">
              <OtpInput
                id="verification-otp"
                value={otp}
                onChange={handleOtpChange}
                onSubmit={handleSubmitOtp}
                placeholder="Enter 6-digit code"
                hideLabel={true}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                onClick={handleSubmitOtp}
                variant="primary"
                size="md"
                disabled={!otp.trim() || isSubmitting}
              >
                {isSubmitting ? "Verifying..." : "Submit"}
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
