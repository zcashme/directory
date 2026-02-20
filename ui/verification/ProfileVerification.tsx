import { useMemo, useState, useCallback } from "react";
import type { Profile } from "@/lib/profile/types";
import type { ProfileEditsPayload } from "@/lib/api/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import { OtpInput } from "@/ui/verification/OtpInput";
import { generateMemoAction } from "@/lib/verification/generateMemoAction";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import Alert from "@/ui/common/feedback/Alert";
import Button from "@/ui/common/buttons/Button";
import { useEditsStore } from "@/ui/profile/store";

const MIN_SIGNIN_AMOUNT = 0.001;
const DEFAULT_SIGNIN_AMOUNT = "0.003";

interface ProfileVerificationProps {
  profile: Profile;
}

export default function ProfileVerification({
  profile,
}: ProfileVerificationProps) {
  // Get edits from store
  const { form, original } = useEditsStore();

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
    if (form.profile_image_url !== original.profile_image_url) {
      edits.profile_image_url = form.profile_image_url;
      hasChanges = true;
    }
    if (form.nearest_city_name !== original.nearest_city_name) {
      edits.nearest_city_name = form.nearest_city_name;
      hasChanges = true;
    }

    // Handle links - compare by id and url
    const formLinkIds = new Set(form.links.map((l) => l.id));
    const linkEdits: ProfileEditsPayload["links"] = [];

    // Find deleted links (in original but not in form)
    for (const origLink of original.links) {
      if (origLink.id && !formLinkIds.has(origLink.id)) {
        linkEdits.push({ id: origLink.id, url: origLink.url, platform: origLink.platform, _delete: true });
      }
    }

    // Find new and updated links
    for (const formLink of form.links) {
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
  }, [form, original]);

  // Local UI state
  const [amount, setAmount] = useState(DEFAULT_SIGNIN_AMOUNT);
  const [qrVisible, setQrVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [otpResult, setOtpResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Memo + URI returned from the server
  const [currentMemo, setCurrentMemo] = useState("");
  const [currentUri, setCurrentUri] = useState("");

  // Validate amount
  const { validAmount, amountError } = useMemo(() => {
    const cleaned = (amount ?? "").trim();
    const raw = cleaned.replace(/[^\d.]/g, "");
    const num = parseFloat(raw);
    const validMin = !Number.isNaN(num) && num >= MIN_SIGNIN_AMOUNT;

    return {
      validAmount: validMin,
      amountError: validMin
        ? ""
        : `Authentication requires at least ${MIN_SIGNIN_AMOUNT} ZEC`,
    };
  }, [amount]);

  // Generate QR — calls the server to create memo + URI
  const handleGenerateQr = useCallback(async () => {
    if (!validAmount || !profile?.id) return;

    setError("");
    setOtpResult(null);
    setOtp("");
    setIsGenerating(true);

    try {
      const result = await generateMemoAction(
        profile.id,
        amount.replace(/[^\d.]/g, "")
      );

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
      setIsGenerating(false);
    }
  }, [validAmount, profile?.id, amount]);

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
  }, [otp, profile.id, currentMemo, buildEditsPayload]);

  // Handle OTP input change - strip non-digits
  const handleOtpChange = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, ""));
  }, []);

  return (
    <div className="bg-transparent border-none shadow-none p-0 mt-1">
      {/* Header */}
      <div className="text-left mb-2">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>
            To verify, send from{" "}
            <span
              className="text-blue-600 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              {profile?.name ?? "Your profile"}
            </span>
          </span>
        </h3>
      </div>

      {/* Memo Display - shown after generation */}
      {currentMemo && (
        <div className="relative group w-full mb-3">
          <div className="block px-3 py-2 bg-gray-800 rounded-t-xl text-center">
            <span className="block text-[12px] text-gray-200">
              Memo (do not modify)
            </span>
          </div>
          <textarea
            value={currentMemo}
            readOnly
            rows={4}
            className="
              w-full
              border border-[#000000]/90
              border-t-0
              rounded-b-xl
              px-3 py-2
              text-[12px]
              bg-gray-50
              text-gray-800
              font-mono
              resize-none
              cursor-default
              break-all
              overflow-y-auto
            "
          />
        </div>
      )}

      {/* Amount + Generate QR */}
      <div className="mt-3 w-full">
        <AmountAndWallet
          amount={amount}
          setAmount={setAmount}
          openWallet={handleGenerateQr}
          openWalletLabel={isGenerating ? "Generating..." : "Generate QR"}
          disabled={isGenerating}
        />
        {!validAmount && amountError && (
          <Alert variant="error" size="sm" message={amountError} className="mt-1" />
        )}
      </div>

      {/* Requirement line */}
      <div className="w-full flex items-center justify-center gap-2 text-center mt-1 mb-4">
        <p className="text-[12px] text-gray-600 italic m-0">
          Include minimum 0.002 ZEC. Do not change the message before sending.
        </p>
      </div>

      {/* Error display (for memo generation errors) */}
      {error && !qrVisible && (
        <Alert variant="error" size="sm" message={error} className="mt-2" />
      )}

      {/* QR Code Display */}
      {qrVisible && currentUri && (
        <div className="border-t border-black/10 mt-4 pt-4">
          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <QrUriBlock uri={currentUri} profileName="verification" />
          </div>

          {/* OTP Entry Section - shown immediately with QR */}
          <div className="mt-4 border border-black/10 rounded-xl p-4 bg-white/80">
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
        </div>
      )}
    </div>
  );
}
