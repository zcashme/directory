import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import type { ProfileEditsPayload } from "@/lib/api/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import { OtpInput } from "@/ui/verification/OtpInput";
import { generateMemoAction } from "@/lib/verification/generateMemoAction";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import Alert from "@/ui/common/feedback/Alert";
import {
  OUTLINE_ACTION_BUTTON_CLASSES,
} from "@/ui/common/buttons/styles";
import { useEditsStore } from "@/ui/profile/store";

function isTruthyLikeMaxi(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

interface ProfileVerificationProps {
  profile: Profile;
  generateQrTrigger?: number;
  onClose?: () => void;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onQrReady?: () => void;
}

function formatLinkChange(count: number, action: "added" | "updated" | "removed"): string | null {
  if (count <= 0) return null;
  const noun = count === 1 ? "link" : "links";
  return `${count} ${noun} ${action}`;
}

function buildSavedSummaryText(items: string[]): string {
  return items.join(", ");
}

export default function ProfileVerification({
  profile,
  generateQrTrigger = 0,
  onLoadingStateChange,
  onQrReady,
}: ProfileVerificationProps) {
  // Get edits from store
  const { form, original, deletedFields, pendingAvatarUpload, clearPendingAvatarUpload, updateField } = useEditsStore();

  // Build edits payload from store (only include changed fields)
  const buildEditsPayload = useCallback((): ProfileEditsPayload | undefined => {
    const edits: ProfileEditsPayload = {};
    let hasChanges = false;
    const nextAddress = form.address.trim();
    const originalAddress = original.address.trim();

    // Compare scalar fields
    if (nextAddress !== originalAddress) {
      edits.address = nextAddress;
      hasChanges = true;
    }
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
    if (
      form.nearest_city_name !== original.nearest_city_name ||
      form.country !== original.country ||
      form.iso2 !== original.iso2
    ) {
      edits.nearest_city_name = form.nearest_city_name;
      edits.country = form.country || null;
      edits.iso2 = form.iso2 || null;
      hasChanges = true;
    }
    if (form.profile_theme_package !== original.profile_theme_package) {
      edits.profile_theme_package = form.profile_theme_package;
      hasChanges = true;
    }
    if (form.profile_card_theme !== original.profile_card_theme) {
      edits.profile_card_theme = form.profile_card_theme;
      hasChanges = true;
    }
    if (form.profile_page_bkgd !== original.profile_page_bkgd) {
      edits.profile_page_bkgd = form.profile_page_bkgd;
      hasChanges = true;
    }
    if (form.profile_card_border !== original.profile_card_border) {
      edits.profile_card_border = form.profile_card_border;
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

  const buildEditsSummary = useCallback((): string[] => {
    const summary: string[] = [];

    if (form.name !== original.name) summary.push("Username");
    if (form.display_name !== original.display_name) summary.push("Display name");
    if (form.bio !== original.bio) summary.push("Bio");
    if (form.address !== original.address) summary.push("Address");
    if (
      form.nearest_city_name !== original.nearest_city_name ||
      form.country !== original.country ||
      form.iso2 !== original.iso2
    ) {
      summary.push("Location");
    }

    if (deletedFields.profile_image_url) {
      summary.push("Avatar removed");
    } else if (pendingAvatarUpload) {
      summary.push("Avatar uploaded");
    } else if (form.profile_image_url !== original.profile_image_url) {
      summary.push(form.profile_image_url ? "Avatar updated" : "Avatar removed");
    }

    if (form.profile_theme_package !== original.profile_theme_package) {
      summary.push("Theme package");
    }
    if (form.profile_card_theme !== original.profile_card_theme) {
      summary.push("Card theme");
    }
    if (form.profile_page_bkgd !== original.profile_page_bkgd) {
      summary.push("Page background");
    }
    if (form.profile_card_border !== original.profile_card_border) {
      summary.push("Card border");
    }

    const activeFormLinkIds = new Set(form.links.filter((l) => !l._delete).map((l) => l.id));
    let linksRemoved = 0;
    let linksAdded = 0;
    let linksUpdated = 0;

    for (const origLink of original.links) {
      const markedForDeletion = form.links.find((l) => l.id === origLink.id)?._delete === true;
      if (origLink.id && (!activeFormLinkIds.has(origLink.id) || markedForDeletion)) {
        linksRemoved += 1;
      }
    }

    for (const formLink of form.links) {
      if (formLink._delete) continue;
      if (!formLink.id) {
        linksAdded += 1;
      } else {
        const origLink = original.links.find((l) => l.id === formLink.id);
        if (origLink && (origLink.url !== formLink.url || origLink.label !== formLink.label)) {
          linksUpdated += 1;
        }
      }
    }

    const addedSummary = formatLinkChange(linksAdded, "added");
    const updatedSummary = formatLinkChange(linksUpdated, "updated");
    const removedSummary = formatLinkChange(linksRemoved, "removed");
    if (addedSummary) summary.push(addedSummary);
    if (updatedSummary) summary.push(updatedSummary);
    if (removedSummary) summary.push(removedSummary);

    return summary;
  }, [form, original, deletedFields.profile_image_url, pendingAvatarUpload]);

  // Local UI state
  const [qrVisible, setQrVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [error, setError] = useState("");
  const [otpResult, setOtpResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [hasSentPayment, setHasSentPayment] = useState(false);

  // Memo + URI returned from the server
  const [currentMemo, setCurrentMemo] = useState("");
  const [currentUri, setCurrentUri] = useState("");
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const lastGenerateTriggerRef = useRef(generateQrTrigger);
  const lastShowQrSectionRef = useRef(false);
  const isMaxi = isTruthyLikeMaxi(profile?.is_maxi);
  const verificationAmountZec = isMaxi ? "0" : "0.004";
  const minAmountHint = isMaxi
    ? "No minimum amount required."
    : "Include a minimum of 0.002 ZEC.";
  const shouldReduceMotion = useReducedMotion() ?? false;
  const tapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
        transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
      };

  // Generate QR - calls the server to create memo + URI
  const handleGenerateQr = useCallback(async () => {
    if (!profile?.id) {
      setIsGeneratingQr(false);
      return;
    }

    setIsGeneratingQr(true);
    setError("");
    setOtpResult(null);
    setOtp("");
    setOtpAttemptsLeft(5);
    setHasSentPayment(false);

    try {
      const result = await generateMemoAction(profile.id, verificationAmountZec);

      if (result.ok && result.memo && result.uri) {
        setCurrentMemo(result.memo);
        setCurrentUri(result.uri);
        setQrVisible(true);
      } else {
        setError(result.error ?? "Failed to generate QR code.");
      }
    } catch {
      setError("Failed to generate QR code. Please try again.");
    } finally {
      setIsGeneratingQr(false);
    }
  }, [profile?.id, verificationAmountZec]);

  useEffect(() => {
    if (!generateQrTrigger) return;
    if (lastGenerateTriggerRef.current === generateQrTrigger) return;

    lastGenerateTriggerRef.current = generateQrTrigger;
    void handleGenerateQr();
  }, [generateQrTrigger, handleGenerateQr]);

  useEffect(() => {
    onLoadingStateChange?.(isGeneratingQr);
  }, [isGeneratingQr, onLoadingStateChange]);

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
        const editSummaryItems = buildEditsSummary();
        const message = editSummaryItems.length > 0
          ? `Verification successful! Saved: ${buildSavedSummaryText(editSummaryItems)}. Refreshing...`
          : edits
            ? "Verification successful! Changes saved. Refreshing..."
            : "Verification successful! Refreshing...";
        setOtpResult({ ok: true, message });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const status =
          response.data && typeof response.data === "object" && "status" in response.data
            ? String((response.data as Record<string, unknown>).status ?? "")
            : "";

        if (status !== "invalid_code") {
          setOtpResult({
            ok: false,
            message: response.error || "Verification failed. Please try again.",
          });
          return;
        }

        const remaining = otpAttemptsLeft - 1;
        setOtpAttemptsLeft(remaining);
        setOtp("");

        if (remaining <= 0) {
          setOtpResult({
            ok: false,
            message: "Too many attempts. Please generate a new QR code.",
          });
          setHasSentPayment(false);
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
  }, [otp, profile.id, currentMemo, otpAttemptsLeft, buildEditsPayload, buildEditsSummary, clearPendingAvatarUpload, updateField]);

  // Handle OTP input change - strip non-digits
  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  const isOtpComplete = otp.trim().length === 6;

  const showQrSection = qrVisible && !!currentUri;
  const qrSectionClasses = showQrSection
    ? "mt-1 pt-1 max-h-[1200px] opacity-100"
    : "max-h-0 opacity-0";

  useEffect(() => {
    const wasVisible = lastShowQrSectionRef.current;
    if (!wasVisible && showQrSection) {
      onQrReady?.();
    }
    lastShowQrSectionRef.current = showQrSection;
  }, [onQrReady, showQrSection]);

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
        <AnimatePresence initial={false}>
          {!hasSentPayment && (
            <motion.div
              key="verification-qr-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.1 }
                  : { duration: 0.3, ease: "easeOut" }
              }
              className="overflow-hidden"
            >
              <div className="flex justify-center mb-4">
                <QrUriBlock
                  uri={currentUri}
                  memoText={currentMemo}
                  profileName={`${profile.name}-verification`}
                  recipientDisplayName={profile.display_name}
                  recipientUsername={profile.name}
                  qrTopHintText={"Send memo to receive code.\n"}
                  qrTopHintDetails={[
                    minAmountHint,
                    "Do not leave the page before entering the code.",
                  ]}
                  qrTopHintToggleLabel="Help"
                  compactTopSpacing
                  bottomActionBar
                  showParsedFieldsToggleAction
                  showPaymentDetails={!hasSentPayment}
                  onTogglePaymentDetails={(next) => setHasSentPayment(!next)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {hasSentPayment && (
            <motion.div
              key="otp-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.1 }
                  : { duration: 0.3, ease: "easeOut" }
              }
              className="overflow-hidden"
            >
              <div className="relative w-full max-w-[380px] mx-auto">
                <motion.button
                  type="button"
                  onClick={() => setHasSentPayment(false)}
                  {...tapProps}
                  className="absolute left-0 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                  aria-label="Back to payment details"
                  title="Back to payment details"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M15 18 9 12l6-6"
                    />
                  </svg>
                </motion.button>
                <div className="relative w-full max-w-[300px] mx-auto bg-transparent">
                  <div className="space-y-3">
                    <p className="text-center text-xs font-normal text-gray-700">
                      Code will be sent to address on profile.
                  </p>
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
                  <button
                    type="button"
                    onClick={handleSubmitOtp}
                    className={`${OUTLINE_ACTION_BUTTON_CLASSES} w-full justify-center px-3 py-2 bg-[var(--color-brand-blue)] border-[var(--color-brand-blue)] text-white hover:bg-[var(--color-brand-blue)]/90 hover:border-[var(--color-brand-blue)]/90 hover:!text-white active:!text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={!isOtpComplete || isSubmitting}
                  >
                    {isSubmitting ? "Verifying..." : "Verify Code"}
                  </button>
                </div>

                {otpResult && (
                  <div
                    className={`mt-3 text-sm font-semibold ${
                      otpResult.ok ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {otpResult.message}
                  </div>
                )}

                {error && (
                  <Alert variant="error" size="sm" message={error} className="mt-2" />
                )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
