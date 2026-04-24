import { useState, useEffect, useMemo, useRef } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import LinkInput from "@/ui/signup/LinkInput";
import SocialLinkInput from "@/ui/signup/SocialLinkInput";
import { buildSocialUrl, normalizeSocialUsername, HOSTS } from "@/lib/profile/usernameNormalizer";
import type { SocialPlatform } from "@/lib/profile/usernameNormalizer";
import { checkUsernameAvailabilityAction } from "@/lib/signup/createProfileAction";
import CitySearchDropdown from "@/ui/signup/CitySearchDropdown";
import HelpIcon from "@/ui/common/HelpIcon";
import ProfileField, { DeleteActionButton } from "@/ui/profile/ProfileField";
import { isValidUrl, normalizeUrl } from "@/lib/profile/urlValidation";
import { isUsernameVerified } from "@/lib/profile/profileUtils";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";
import { useEditsStore, type ParsedLink, type FormState } from "@/ui/profile/store";
import type { Profile, EnrichedProfileLink } from "@/lib/profile/types";
import Alert from "@/ui/common/feedback/Alert";
import Button from "@/ui/common/buttons/Button";
import { withFieldBorderState } from "@/ui/common/forms/styles";
import { validateZcashAddress } from "@/ui/signup/zcashAddress";

const MAX_DISPLAY_NAME_LENGTH = 32;

function validateDisplayName(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true }; // Display name is optional in edit
  }
  // Check for control characters (newlines, tabs, etc.)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
    return { valid: false, error: "Display name contains invalid characters." };
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return { valid: false, error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less.` };
  }
  return { valid: true };
}

function detectPlatformFromUrl(rawUrl: string | null | undefined): string | null {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return null;
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    for (const [platform, hosts] of Object.entries(HOSTS)) {
      if ((hosts as string[]).includes(host)) return platform;
    }
  } catch {
    return null;
  }
  return null;
}

function parseSocialUrl(rawUrl: string | null | undefined): {
  platform: string;
  username: string;
  otherUrl: string;
} {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return { platform: "X", username: "", otherUrl: "" };
  const platform = detectPlatformFromUrl(trimmed);
  if (!platform) return { platform: "Other", username: "", otherUrl: trimmed };
  return {
    platform,
    username: normalizeSocialUsername(trimmed, platform as SocialPlatform),
    otherUrl: "",
  };
}

function toPrettyDomain(rawUrl: string): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return "";
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : normalizeUrl(trimmed);
  try {
    const host = new URL(normalized).hostname || "";
    return host.replace(/^www\./i, "") || trimmed;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function canonicalizeHttpsUrl(rawUrl: string): string | null {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return null;
  const normalized = normalizeUrl(trimmed);
  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

function deriveEditedLinkLabel(value: {
  platform?: string;
  username?: string;
  otherUrl?: string;
  url?: string;
}): string {
  const platform = (value.platform || "X") as SocialPlatform;
  if (platform === "Other") {
    const raw = (value.otherUrl || value.url || "").trim();
    if (!raw) return "";
    return toPrettyDomain(raw);
  }

  const username = (value.username || "").trim();
  if (!username) return "";
  if (platform === "Discord") return username;
  return normalizeSocialUsername(username, platform);
}

const FIELD_CLASS =
  `w-full rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 ${withFieldBorderState("border-[#0a1126]/60")}`;
const LINK_FIELD_CLASS =
  `rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 appearance-none ${withFieldBorderState("border-[#0a1126]/60")}`;
const LINK_CONTAINER_CLASS =
  "rounded-2xl border border-[#0a1126]/60 p-3 bg-transparent";
const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png"] as const;

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), base64Data: match[2] };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file."));
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const result = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image dimensions."));
    };
    img.src = objectUrl;
  });
}

interface CharCounterProps {
  text: string;
}

interface BioLeftIconProps extends CharCounterProps {
  isActive: boolean;
}

function BioLeftIcon({ text, isActive }: BioLeftIconProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const showCircle = isActive && bytes > 25;

  if (!showCircle) {
    return (
      <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true">
        <path
          d="M3 11L4 8L9.5 2.5C9.9 2.1 10.5 2.1 10.9 2.5L11.5 3.1C11.9 3.5 11.9 4.1 11.5 4.5L6 10L3 11Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const remaining = Math.max(0, 100 - bytes);
  const remainingRatio = remaining / 100;
  const overBytes = Math.max(0, bytes - 100);
  const overRatio = Math.min(1, overBytes / 100);
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const isOverLimit = overBytes > 0;
  const dashOffset = isOverLimit
    ? circumference * (1 - overRatio)
    : circumference * (1 - remainingRatio);
  const strokeColor = isOverLimit ? "rgb(220, 38, 38)" : "var(--color-brand-blue)";
  const ringTransform = isOverLimit ? "scaleX(-1) rotate(-90deg)" : "rotate(-90deg)";

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="rgba(156, 163, 175, 0.35)"
        strokeWidth="2"
      />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="transition-[stroke-dashoffset] duration-200 ease-out"
        style={{
          transform: ringTransform,
          transformOrigin: "50% 50%",
          transformBox: "fill-box",
        }}
      />
    </svg>
  );
}

function CharCounter({ text }: CharCounterProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const remaining = 100 - bytes;
  const showRemaining = remaining <= 20;

  if (!showRemaining) return null;

  return (
    <span
      className={`absolute bottom-3 right-3 text-xs ${remaining < 0 ? "text-red-600" : "text-gray-500"}`}
    >
      {remaining < 0 ? `Over by ${Math.abs(remaining)} bytes` : `${remaining} bytes remaining`}
    </span>
  );
}

/**
 * Small italicized hint shown below an edited field to remind the user that
 * pending changes only persist after OTP verification ("Start Verification").
 */
function VerifyHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mt-1 text-xs italic text-gray-500">Verify to apply changes</p>
  );
}

interface ProfileEditorProps {
  profile: Profile;
  links?: EnrichedProfileLink[];
  onAuthenticateLink?: (link: { url: string }) => void;
  onGenerateQr?: () => void;
  isVerificationGenerating?: boolean;
}


const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function ProfileEditor({
  profile,
  links,
  onAuthenticateLink,
  onGenerateQr,
  isVerificationGenerating = false,
}: ProfileEditorProps) {
  const {
    form,
    original,
    deletedFields,
    pendingAvatarUpload,
    setForm,
    updateField,
    setDeletedField,
    setPendingAvatarUpload,
    clearPendingAvatarUpload,
    initializeForm,
  } = useEditsStore();
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingAvatarPreviewSrc = useMemo(() => {
    if (!pendingAvatarUpload) return "";
    return `data:${pendingAvatarUpload.mimeType};base64,${pendingAvatarUpload.base64Data}`;
  }, [pendingAvatarUpload]);

  // Display value for city search input (local UI state)
  const [nearestCityDisplay, setNearestCityDisplay] = useState(profile.nearest_city_name ?? "");
  const [isBioActive, setIsBioActive] = useState(false);

  // Display name validation
  const displayNameValidation = useMemo(() => validateDisplayName(form.display_name), [form.display_name]);
  const displayNameError = displayNameValidation.valid ? null : displayNameValidation.error;

  // Normalize incoming DB links
  const originalLinks = useMemo(() => {
    const arr = Array.isArray(links) ? links : Array.isArray(profile.links) ? profile.links : [];
    return arr.map((l) => {
      const parsed = parseSocialUrl(l.url ?? "");
      const isDiscordProfileUrl = /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/users\/[^/?#]+/i.test(l.url || "");
      const prefersLabel = parsed.platform === "Discord" && isDiscordProfileUrl && l.label;
      return {
        id: l.id ?? null,
        url: l.url ?? "",
        label: l.label ?? "",
        ...parsed,
        username: prefersLabel ? l.label : parsed.username,
        previewUrl: prefersLabel ? (l.url ?? "") : "",
        valid: true,
        reason: null,
        is_verified: !!l.is_verified,
        verification_expires_at: l.verification_expires_at,
        _uid: crypto.randomUUID()
      } as ParsedLink;
    });
  }, [profile, links]);

  // Initialize form from profile and links (only when profile ID changes)
  useEffect(() => {
    initializeForm(profile, originalLinks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]); // Only re-initialize if profile ID changes

  const originals = useMemo(
    () => ({
      address: profile.address ?? "",
      name: profile.name ?? "",
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      profile_image_url: profile.profile_image_url ?? "",
    }),
    [profile]
  );
  const usernameLockedSuffix = useMemo(() => {
    if (isUsernameVerified(profile)) return "";
    if (typeof profile.id !== "number") return "";
    return `-${profile.id}`;
  }, [profile.address_verified, profile.id]);
  const [usernameInput, setUsernameInput] = useState(form.name ?? "");
  const [usernameConflict, setUsernameConflict] = useState<string | null>(null);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [lastValidUsername, setLastValidUsername] = useState(form.name ?? "");
  const displayedUsername = `${usernameInput}${usernameLockedSuffix}`;

  useEffect(() => {
    setUsernameInput(form.name ?? "");
  }, [form.name]);

  useEffect(() => {
    setUsernameTouched(false);
    setUsernameConflict(null);
    setUsernameStatus("idle");
    setLastValidUsername(profile.name ?? "");
  }, [profile.id]);

  useEffect(() => {
    if (!usernameTouched) {
      setUsernameConflict(null);
      setUsernameStatus("idle");
      return;
    }

    const candidate = sanitizeUsernameInput(usernameInput);
    const originalNameRaw = originals.name ?? "";

    if (!candidate) {
      setUsernameConflict(null);
      setUsernameStatus("idle");
      if (form.name !== "") handleChange("name", "");
      return;
    }

    if (!candidate || candidate === originalNameRaw) {
      setUsernameConflict(null);
      setUsernameStatus("idle");
      const nextValue = candidate || originalNameRaw;
      if (form.name !== nextValue) {
        handleChange("name", nextValue);
      }
      setLastValidUsername(nextValue);
      return;
    }

    let cancelled = false;
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailabilityAction(candidate, profile.id);
      if (cancelled) return;
      if (result.ok && result.taken_by_other_verified) {
        setUsernameConflict("That username is already used by another verified profile.");
        setUsernameStatus("taken");
        if (form.name !== lastValidUsername) {
          handleChange("name", lastValidUsername);
        }
      } else {
        setUsernameConflict(null);
        setUsernameStatus("available");
        if (form.name !== candidate) {
          handleChange("name", candidate);
        }
        setLastValidUsername(candidate);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [usernameInput, usernameTouched, profile.id, originals.name, form.name, lastValidUsername]);

  const handleChange = (field: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      if (field === "name" && deletedFields.name) {
        setDeletedField("name", false);
      } else if (field === "display_name" && deletedFields.display_name) {
        setDeletedField("display_name", false);
      } else if (field === "bio" && deletedFields.bio) {
        setDeletedField("bio", false);
      } else if (field === "address" && deletedFields.address) {
        setDeletedField("address", false);
      } else if (field === "nearest_city_name" && deletedFields.nearest_city) {
        setDeletedField("nearest_city", false);
      }
    }
    updateField(field as keyof FormState, value);
  };

  const handleAvatarUploadClick = () => {
    setAvatarUploadError(null);
    fileInputRef.current?.click();
  };

  const handlePendingAvatarRemove = () => {
    clearPendingAvatarUpload();
    setAvatarUploadError(null);
  };

  const addressValidation = validateZcashAddress(form.address.trim());

  const getAddressFieldError = () => {
    if (!form.address.trim()) return "Zcash Address is required to start verification.";
    if (!addressValidation.valid) return "Enter a valid Zcash address.";
    if (addressValidation.type === "tex") return "TEX addresses are not supported for verification. Use a z- or u-address.";
    if (addressValidation.type === "transparent") return "Transparent addresses are not supported for verification. Use a z- or u-address.";
    return null;
  };
  const addressFieldError = getAddressFieldError();
  const hasInvalidLinks = useMemo(() => {
    return form.links.some((row) => {
      const isVerified = !!row.is_verified;
      const isMarkedForDeletion = row.id !== null && !!row._delete;
      const currentUrl = (row.url ?? "").trim();
      return (
        (!isMarkedForDeletion && !isVerified && row.valid === false) ||
        (!isMarkedForDeletion && isVerified && currentUrl.length > 0 && !isValidUrl(currentUrl).valid)
      );
    });
  }, [form.links]);
  const hasInvalidFields = Boolean(addressFieldError || usernameConflict || displayNameError || hasInvalidLinks);

  const handleStartVerification = () => {
    if (hasInvalidFields) {
      return;
    }
    if (isVerificationGenerating) {
      return;
    }
    onGenerateQr?.();
  };

  const handleAvatarFileSelection = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadError(null);
    if (deletedFields.profile_image_url) {
      setDeletedField("profile_image_url", false);
    }

    const type = (file.type || "").toLowerCase();
    if (!SUPPORTED_AVATAR_MIME_TYPES.includes(type as (typeof SUPPORTED_AVATAR_MIME_TYPES)[number])) {
      setAvatarUploadError("Unsupported format. Use JPG or PNG.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
      setAvatarUploadError("File too large. Maximum size is 2 MB.");
      e.target.value = "";
      return;
    }

    try {
      const [dimensions, dataUrl] = await Promise.all([
        loadImageDimensions(file),
        readFileAsDataUrl(file),
      ]);
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        setAvatarUploadError("Could not parse selected image.");
        e.target.value = "";
        return;
      }

      const extension = type === "image/png" ? "png" : "jpg";
      setPendingAvatarUpload({
        fileName: file.name,
        mimeType: type as "image/jpeg" | "image/png",
        extension,
        base64Data: parsed.base64Data,
        sizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch {
      setAvatarUploadError("Failed to validate image. Please choose a different file.");
    } finally {
      e.target.value = "";
    }
  };


  const handleLinkChange = (uid: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l._uid === uid ? { ...l, url: value } : l)),
    }));
  };

  const handleSocialLinkChange = (uid: string, value: any) => {
    const rawOtherUrl = (value.otherUrl ?? "").trim();
    const canonicalOtherUrl = canonicalizeHttpsUrl(rawOtherUrl);
    const nextUrl =
      value.platform === "Other"
        ? (canonicalOtherUrl ?? rawOtherUrl)
        : buildSocialUrl(value.platform, (value.username ?? "").trim()) ?? "";
    const nextLabel = deriveEditedLinkLabel({ ...value, url: nextUrl });
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l) =>
        l._uid === uid ? { ...l, ...value, url: nextUrl, label: nextLabel } : l
      ),
    }));
  };

  const addLink = () =>
    setForm((prev) => ({
      ...prev,
      links: [
        ...prev.links,
        {
          id: null, url: "", _delete: false, platform: "X" as const, username: "", otherUrl: "",
          valid: true, reason: null, is_verified: false,
          _uid: crypto.randomUUID(),
        },
      ],
    }));

  const removeLink = (uid: string) => {
    setForm((prev) => {
      const target = prev.links.find((l) => l._uid === uid);
      if (!target) return prev;
      if (target.id === null) {
        return {
          ...prev,
          links: prev.links.filter((l) => l._uid !== uid),
        };
      }
      return {
        ...prev,
        links: prev.links.map((l) => (l._uid === uid ? { ...l, _delete: !l._delete } : l)),
      };
    });
  };

  const resetLinks = () => {
    setForm((prev) => ({
      ...prev,
      links:
        originalLinks.length > 0
          ? originalLinks.map((l) => ({ ...l }))
          : [{
              id: null, url: "", _delete: false, is_verified: false,
              _uid: crypto.randomUUID(),
            } as ParsedLink],
    }));
  };

  const toggleAddress = (e?: MouseEvent<HTMLButtonElement>) => {
    const nextDeleted = !deletedFields.address;
    if (nextDeleted && !profile.address_verified && e) {
      const btn = e.currentTarget;
      const popup = e.currentTarget.nextElementSibling as HTMLElement;
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("shake");
      popup.classList.add("show");
      clearTimeout((popup as any)._timer);
      (popup as any)._timer = setTimeout(() => { popup.classList.remove("show"); }, 3000);
      return;
    }
    setDeletedField("address", nextDeleted);
  };

  const toggleNameDelete = () => {
    const nextDeleted = !deletedFields.name;
    if (nextDeleted) {
      const confirmed = window.confirm(
        "Careful! Verifying this change (deleting usermame) will remove your profile data from Zcash.me. This action cannot be undone."
      );
      if (!confirmed) return;
    }
    setDeletedField("name", nextDeleted);
    setUsernameTouched(false);
    setUsernameConflict(null);
    setUsernameStatus("idle");
    setUsernameInput(nextDeleted ? "" : originals.name);
  };

  const toggleProfileImageDelete = () => {
    const nextDeleted = !deletedFields.profile_image_url;
    if (nextDeleted) {
      clearPendingAvatarUpload();
      setAvatarUploadError(null);
    }
    setDeletedField("profile_image_url", nextDeleted);
  };

  const toggleNearestCityDelete = () => {
    const nextDeleted = !deletedFields.nearest_city;
    setDeletedField("nearest_city", nextDeleted);
    setNearestCityDisplay(nextDeleted ? "" : (profile.nearest_city_name ?? ""));
  };

  // Per-field dirtiness flags. Each is true when the form value diverges from
  // the original snapshot stored at initializeForm() time. When true and the
  // field is NOT already showing a deletion alert (which already mentions OTP),
  // we render a "Verify to apply changes" hint below the field.
  const isAvatarDirty =
    !!pendingAvatarUpload ||
    deletedFields.profile_image_url ||
    form.profile_image_url !== original.profile_image_url;
  const isNameDirty = deletedFields.name || form.name !== original.name;
  const isDisplayNameDirty =
    deletedFields.display_name || form.display_name !== original.display_name;
  const isBioDirty = deletedFields.bio || form.bio !== original.bio;
  const isNearestCityDirty =
    deletedFields.nearest_city || form.nearest_city_name !== original.nearest_city_name;

  return (
    <div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
      <div className="w-full max-w-xl bg-transparent overflow-visible">
        {/* PROFILE IMAGE URL */}
        <ProfileField
          label="Profile Image"
          htmlFor="pimg"
          helpText="New images are applied only after OTP verification. Deleting marks the image for removal."
          isDeleted={deletedFields.profile_image_url}
          deleteDisabled={!originals.profile_image_url}
          onDelete={toggleProfileImageDelete}
        >
          <input
            id="pimg"
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={handleAvatarFileSelection}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAvatarUploadClick}
              className="hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
            >
              Upload
            </Button>
            {pendingAvatarUpload ? (
              <span className="text-xs text-gray-700">
                Pending: <span className="font-mono">{pendingAvatarUpload.fileName}</span> ({Math.round(pendingAvatarUpload.sizeBytes / 1024)} KB, {pendingAvatarUpload.width} x {pendingAvatarUpload.height}). This will upload after OTP verification.
              </span>
            ) : (
              <span className="text-xs text-gray-600">
                Requirements: JPG or PNG, max 2 MB (recommended 400 x 400).
              </span>
            )}
          </div>
          {pendingAvatarUpload && pendingAvatarPreviewSrc && (
            <div className="mt-3 relative w-full max-w-[240px] rounded-xl border border-gray-300 bg-white/70 p-3">
              <button
                type="button"
                onClick={handlePendingAvatarRemove}
                aria-label="Remove pending upload"
                title="Remove pending upload"
                className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full border border-gray-300 bg-white/90 text-gray-700 text-sm leading-none hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                X
              </button>
              <div className="w-full flex items-center justify-center">
                <div
                  className="relative rounded-full overflow-hidden shrink-0 border border-black bg-[var(--color-background)]"
                  style={{ width: "126px", height: "126px" }}
                >
                  <div className="absolute inset-[2px] rounded-full overflow-hidden">
                    <img
                      src={pendingAvatarPreviewSrc}
                      alt={profile.display_name || profile.name || "Profile image preview"}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {deletedFields.profile_image_url && (
            <Alert
              variant="error"
              size="sm"
              message="Profile image is marked for deletion and will be removed from your profile and storage after OTP verification. Reset to undo."
              className="mt-1"
            />
          )}
          {avatarUploadError && (
            <Alert variant="error" size="sm" message={avatarUploadError} className="mt-1" />
          )}
          <VerifyHint show={isAvatarDirty && !deletedFields.profile_image_url} />
        </ProfileField>

        {/* ZCASH ADDRESS */}
        <ProfileField
          label="Zcash Address"
          htmlFor="addr"
          helpText="One-time passcodes are sent to your current address on file, not to a newly requested address change."
          isDeleted={deletedFields.address}
          deleteDisabled={!profile.address_verified && !deletedFields.address}
          onDelete={toggleAddress}
          deletePopup={
            <div className="absolute fade-popup z-50 w-90 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs right-0 bottom-full mb-1">
              Cannot change unverified address. <br /> Lost access? Create new profile.
            </div>
          }
        >
          <input
            id="addr"
            type="text"
            value={form.address}
            placeholder={originals.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className={`${FIELD_CLASS} font-mono ${addressFieldError ? withFieldBorderState("border-[#0a1126]/60", true) : ""}`}
          />
          {addressFieldError && (
            <p className="mt-1 text-xs text-red-600">{addressFieldError}</p>
          )}
        </ProfileField>

        {/* USERNAME */}
        <ProfileField
          label="Username"
          htmlFor="name"
          helpText={
            usernameLockedSuffix
              ? `Your unique handle on Zcash.me. Start verification to remove ${usernameLockedSuffix}`
              : "Your unique handle on Zcash.me."
          }
          isDeleted={deletedFields.name}
          deleteDisabled={!originals.name}
          onDelete={toggleNameDelete}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
              Zcash.me/
            </span>
            <input
              id="name"
              type="text"
              value={displayedUsername}
              placeholder={originals.name}
              onChange={(e) => {
                let raw = e.target.value ?? "";
                if (usernameLockedSuffix) {
                  raw = raw.replace(new RegExp(escapeRegex(usernameLockedSuffix), "g"), "");
                }
                const val = sanitizeUsernameInput(raw);
                setUsernameTouched(true);
                setUsernameInput(val);
              }}
              onKeyDown={(e) => {
                if (!usernameLockedSuffix) return;
                const input = e.currentTarget;
                const baseLen = form.name.length;
                const start = input.selectionStart ?? 0;
                const end = input.selectionEnd ?? 0;
                const overlapsLockedSuffix = end > baseLen;
                if ((e.key === "Backspace" || e.key === "Delete") && overlapsLockedSuffix) {
                  e.preventDefault();
                  input.setSelectionRange(Math.min(start, baseLen), Math.min(start, baseLen));
                }
              }}
              onClick={(e) => {
                if (!usernameLockedSuffix) return;
                const input = e.currentTarget;
                const baseLen = form.name.length;
                const start = input.selectionStart ?? 0;
                const end = input.selectionEnd ?? 0;
                if (start > baseLen || end > baseLen) {
                  input.setSelectionRange(baseLen, baseLen);
                }
              }}
              className={`${FIELD_CLASS} pl-[5.5rem] ${usernameConflict ? withFieldBorderState("border-[#0a1126]/60", true) : ""}`}
            />
          </div>
          {deletedFields.name && (
            <Alert
              variant="error"
              size="sm"
              message="Your profile is marked for deletion and will be removed from Zcash.me after OTP verification. Reset to undo."
              className="mt-1"
            />
          )}
          {usernameConflict && (
            <p className="mt-1 text-xs text-red-600">{usernameConflict}</p>
          )}
          {!usernameConflict && usernameTouched && usernameInput && usernameStatus === "checking" && (
            <p className="mt-1 text-xs text-gray-500">Checking availability...</p>
          )}
          {!usernameConflict && usernameTouched && usernameInput && usernameStatus === "available" && (
            <p className="mt-1 text-xs text-green-600">This name is available.</p>
          )}
          <VerifyHint show={isNameDirty && !deletedFields.name && !usernameConflict} />
        </ProfileField>

        {/* DISPLAY NAME */}
        <ProfileField
          label="Display Name"
          htmlFor="display_name"
          helpText="Your public display name."
          isDeleted={deletedFields.display_name}
          deleteDisabled={!originals.display_name}
          onDelete={() => setDeletedField("display_name", !deletedFields.display_name)}
        >
          <input
            id="display_name"
            type="text"
            value={form.display_name}
            placeholder={deletedFields.display_name ? "" : (originals.display_name ?? "Enter display name")}
            onChange={(e) => handleChange("display_name", e.target.value)}
            maxLength={MAX_DISPLAY_NAME_LENGTH + 5}
            className={`${FIELD_CLASS} ${displayNameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          />
          {displayNameError && (
            <p className="mt-1 text-xs text-red-600">{displayNameError}</p>
          )}
          {deletedFields.display_name && (
            <Alert
              variant="error"
              size="sm"
              message="Display name is marked for deletion and will be removed from your profile after OTP verification. Reset to undo."
              className="mt-1"
            />
          )}
          <VerifyHint show={isDisplayNameDirty && !deletedFields.display_name && !displayNameError} />
        </ProfileField>

        {/* BIOGRAPHY */}
        <ProfileField
          label="Biography"
          htmlFor="bio"
          helpText="Your current story arc in 100 characters or less."
          isDeleted={deletedFields.bio}
          deleteDisabled={!originals.bio}
          onDelete={() => setDeletedField("bio", !deletedFields.bio)}
        >
          <div className="relative">
            <div className="absolute left-3 top-3 pointer-events-none text-gray-500 h-5 w-5 flex items-center justify-center">
              <BioLeftIcon text={form.bio} isActive={isBioActive} />
            </div>
            <textarea
              id="bio"
              rows={3}
              maxLength={100}
              value={form.bio}
              placeholder={deletedFields.bio ? "" : originals.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              onFocus={() => setIsBioActive(true)}
              onBlur={() => setIsBioActive(false)}
              className={`${FIELD_CLASS} resize-none overflow-hidden pl-8 pr-8 pb-8 pt-2.5 relative text-left whitespace-pre-wrap break-words`}
            />
            <CharCounter text={form.bio} />
          </div>
          {deletedFields.bio && (
            <Alert
              variant="error"
              size="sm"
              message="Biography is marked for deletion and will be removed from your profile after OTP verification. Reset to undo."
              className="mt-1"
            />
          )}
          <VerifyHint show={isBioDirty && !deletedFields.bio} />
        </ProfileField>

        {/* NEAREST CITY */}
        <ProfileField
          label="Nearest City"
          helpText="Select the city closest to you. This helps with regional discovery and relevance."
          isDeleted={deletedFields.nearest_city}
          deleteDisabled={!profile.nearest_city_name}
          onDelete={toggleNearestCityDelete}
        >
          <CitySearchDropdown
            value={nearestCityDisplay}
            placeholder={
              !deletedFields.nearest_city && form.nearest_city_name && nearestCityDisplay === ""
                ? form.nearest_city_name
                : deletedFields.nearest_city
                  ? ""
                  : "Search nearest city..."
            }
            onChange={(val) => {
              if (typeof val === "string") {
                if (deletedFields.nearest_city && val.trim()) {
                  setDeletedField("nearest_city", false);
                }
                setNearestCityDisplay(val);
              } else {
                if (deletedFields.nearest_city && (val.fullLabel ?? "").trim()) {
                  setDeletedField("nearest_city", false);
                }
                setNearestCityDisplay(val.fullLabel ?? "");
                updateField('nearest_city_name', val.fullLabel ?? "");
              }
            }}
          />
          {deletedFields.nearest_city && (
            <Alert
              variant="error"
              size="sm"
              message="Nearest city is marked for deletion and will be removed from your profile after OTP verification. Reset to undo."
              className="mt-1"
            />
          )}
          <VerifyHint show={isNearestCityDirty && !deletedFields.nearest_city} />
        </ProfileField>

        {/* Links */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <label className="block font-semibold text-gray-700">Links</label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={resetLinks}
                variant="ghost"
                size="xs"
                className={`font-semibold underline ${JSON.stringify(form.links.map(l => ({ id: l.id, url: l.url, _delete: !!l._delete }))) !==
                  JSON.stringify(originalLinks.map(l => ({ id: l.id, url: l.url, _delete: !!l._delete })))
                  ? "text-green-700"
                  : "text-gray-500"
                  }`}
              >
                Reset
              </Button>
              <HelpIcon text="Authenticated links cannot be changed. Links can only be authenticated after verifying your address via OTP" />
            </div>
          </div>
        </div>

        {form.links.map((row) => {
          const originalRow = originalLinks.find((o) => o.id === row.id) ?? ({} as ParsedLink);
          const isVerified = !!row.is_verified;
          const isMarkedForDeletion = row.id !== null && !!row._delete;
          const currentUrl = (row.url ?? "").trim();
          // A row is "dirty" if it's brand new (no DB id), edited from its
          // original (url/label/platform), or marked for deletion. In any of
          // these states the [Authenticate] button is invalid because the DB
          // row doesn't yet match what's on screen — show "Verify to apply
          // changes" in its place. The user has to OTP-verify first to commit.
          const isNewRow = row.id === null;
          const isLinkDirty =
            isNewRow ||
            isMarkedForDeletion ||
            (originalRow.url ?? "") !== row.url ||
            (originalRow.label ?? "") !== (row.label ?? "") ||
            (originalRow.platform ?? "") !== (row.platform ?? "");

          const rowConflict =
            (!isMarkedForDeletion && !isVerified && row.valid === false) ||
            (!isMarkedForDeletion && isVerified && currentUrl.length > 0 && !isValidUrl(currentUrl).valid);
          const rowContainerClass = `${LINK_CONTAINER_CLASS} ${
            rowConflict || isMarkedForDeletion ? "border-red-400" : "border-[#0a1126]/60"
          }`;
          const rowSelectClass = `${LINK_FIELD_CLASS} ${
            rowConflict ? withFieldBorderState("border-[#0a1126]/60", true) : ""
          }`;
          const rowInputClass = `${LINK_FIELD_CLASS} ${
            rowConflict ? withFieldBorderState("border-[#0a1126]/60", true) : ""
          }`;

          const linkActions = (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      disabled
                      variant="primary"
                      size="xs"
                      className="!text-green-700 !border-green-400"
                    >
                      Authenticated
                    </Button>
                  </div>
                ) : isLinkDirty ? (
                  <span className="text-xs italic text-gray-500">
                    Verify to apply changes
                  </span>
                ) : row.id !== null && !isMarkedForDeletion ? (
                  !isValidUrl(currentUrl).valid ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="xs"
                        disabled
                      >
                        Authenticate
                      </Button>
                      <span className="text-xs text-red-600">
                        Not a valid URL
                      </span>
                    </div>
                  ) : profile.address_verified && onAuthenticateLink ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="xs"
                      onClick={() => onAuthenticateLink({ url: row.url })}
                    >
                      Authenticate
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="xs"
                        disabled
                      >
                        Authenticate
                      </Button>
                      <span className="text-xs text-gray-500">
                        Only verified profiles can authenticate links
                      </span>
                    </div>
                  )
                ) : null}
              </div>
              <DeleteActionButton onClick={() => removeLink(row._uid)} isDeleted={isMarkedForDeletion} />
            </div>
          );

          return (
            <div key={row._uid} className="mb-2">
              {isMarkedForDeletion ? (
                <div className={rowContainerClass}>
                  <LinkInput
                    value={row.url}
                    onChange={(v) => handleLinkChange(row._uid, v)}
                    readOnly={true}
                    placeholder={originalRow?.url ?? "example.com"}
                    showValidation={false}
                    inputClassName="border-0 px-0 py-0 bg-transparent"
                  />
                  <Alert
                    variant="error"
                    size="sm"
                    message="This link is marked for deletion and will be removed from your profile after OTP verification. Reset to undo."
                    className="mt-1"
                  />
                  <div className="mt-2">{linkActions}</div>
                </div>
              ) : isVerified ? (
                <div className={rowContainerClass}>
                  <LinkInput
                    value={row.url}
                    onChange={(v) => handleLinkChange(row._uid, v)}
                    readOnly={true}
                    placeholder={originalRow?.url ?? "example.com"}
                    showValidation={false}
                    inputClassName="border-0 px-0 py-0 bg-transparent"
                  />
                  <div className="mt-2">{linkActions}</div>
                </div>
              ) : (
                <SocialLinkInput
                  value={row}
                  onChange={(v) => handleSocialLinkChange(row._uid, v)}
                  footer={linkActions}
                  containerClassName={rowContainerClass}
                  selectClassName={rowSelectClass}
                  inputClassName={rowInputClass}
                />
              )}
            </div>
          );
        })}

        <Button
          size="sm"
          variant="ghost"
          onClick={addLink}
          className="font-semibold mt-1"
        >
          ＋ Add Link
        </Button>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-black/10">
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleStartVerification}
              disabled={hasInvalidFields || isVerificationGenerating}
              className={`relative overflow-hidden rounded-xl hover:border-[var(--color-brand-blue)] ${
                isVerificationGenerating ? "text-white border-[var(--color-brand-blue)] bg-white" : "hover:text-[var(--color-brand-blue)]"
              }`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-[var(--color-brand-blue)] transition-[height] duration-500 ease-out"
                style={{ height: isVerificationGenerating ? "100%" : "0%" }}
              />
              <span className="relative z-10 font-semibold">
                Start Verification
              </span>
            </Button>
          </div>
          {hasInvalidFields && (
            <p className="mt-2 text-center text-xs text-red-600">
              Fix invalid fields before applying changes.
            </p>
          )}
        </div>

      </div>
      <p className="text-sm text-gray-400 text-center mt-4">
      </p>
    </div>
  );
}
