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
import { isValidUrl } from "@/lib/profile/urlValidation";
import { isUsernameVerified } from "@/lib/profile/profileUtils";
import { sanitizeUsernameInput } from "@/lib/profile/usernamePolicy";
import { useEditsStore, type ParsedLink, type FormState } from "@/ui/profile/store";
import type { Profile, EnrichedProfileLink } from "@/lib/profile/types";
import Alert from "@/ui/common/feedback/Alert";
import Button from "@/ui/common/buttons/Button";
import { withFieldBorderState } from "@/ui/common/forms/styles";

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

const FIELD_CLASS =
  `w-full rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 ${withFieldBorderState("border-[#0a1126]/60")}`;
const LINK_FIELD_CLASS =
  `rounded-2xl border px-3 py-2 text-sm bg-transparent outline-hidden text-gray-800 placeholder-gray-400 appearance-none ${withFieldBorderState("border-[#0a1126]/60")}`;
const LINK_CONTAINER_CLASS =
  "rounded-2xl border border-[#0a1126]/60 p-3 bg-transparent";
const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"] as const;

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

function isAnimatedGif(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13) return false;
  if (
    bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46 ||
    bytes[3] !== 0x38 || (bytes[4] !== 0x37 && bytes[4] !== 0x39) || bytes[5] !== 0x61
  ) {
    return false;
  }

  let frameCount = 0;
  for (let i = 13; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (b === 0x2c) {
      frameCount += 1;
      if (frameCount > 1) return true;
      continue;
    }
    if (b === 0x21) {
      i += 1;
      while (i < bytes.length) {
        const blockSize = bytes[i];
        if (blockSize === 0) break;
        i += blockSize + 1;
      }
      continue;
    }
    if (b === 0x3b) break;
  }
  return false;
}

interface CharCounterProps {
  text: string;
}

function CharCounter({ text }: CharCounterProps) {
  const remaining = 100 - text.length;
  const over = remaining < 0;
  return (
    <span
      className={`absolute bottom-2 right-2 text-xs ${over ? "text-red-600" : "text-gray-400"}`}
    >
      {over ? `-${-remaining} chars` : `+${remaining} chars`}
    </span>
  );
}

interface ProfileEditorProps {
  profile: Profile;
  links?: EnrichedProfileLink[];
  onAuthenticateLink?: (link: { url: string }) => void;
  onGenerateQr?: () => void;
}


const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function ProfileEditor({ profile, links, onAuthenticateLink, onGenerateQr }: ProfileEditorProps) {
  const {
    form,
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

  const handleChange = (field: string, value: string) =>
    updateField(field as keyof FormState, value);

  const handleAvatarUploadClick = () => {
    setAvatarUploadError(null);
    fileInputRef.current?.click();
  };

  const handlePendingAvatarRemove = () => {
    clearPendingAvatarUpload();
    setAvatarUploadError(null);
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
      setAvatarUploadError("Unsupported format. Use JPG, PNG, or non-animated GIF.");
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

      if (type === "image/gif") {
        const buffer = await file.arrayBuffer();
        if (isAnimatedGif(buffer)) {
          setAvatarUploadError("Animated GIFs are not supported. Please upload a non-animated GIF.");
          e.target.value = "";
          return;
        }
      }

      const extension = type === "image/png" ? "png" : type === "image/gif" ? "gif" : "jpg";
      setPendingAvatarUpload({
        fileName: file.name,
        mimeType: type as "image/jpeg" | "image/png" | "image/gif",
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
    const nextUrl =
      value.platform === "Other"
        ? (value.otherUrl ?? "").trim()
        : buildSocialUrl(value.platform, (value.username ?? "").trim()) ?? "";
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l) =>
        l._uid === uid ? { ...l, ...value, url: nextUrl } : l
      ),
    }));
  };

  const addLink = () =>
    setForm((prev) => ({
      ...prev,
      links: [
        ...prev.links,
        {
          id: null, url: "", platform: "X" as const, username: "", otherUrl: "",
          valid: true, reason: null, is_verified: false,
          _uid: crypto.randomUUID(),
        },
      ],
    }));

  const removeLink = (uid: string) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l._uid !== uid)
    }));
  };

  const resetLinks = () => {
    setForm((prev) => ({
      ...prev,
      links:
        originalLinks.length > 0
          ? originalLinks.map((l) => ({ ...l }))
          : [{
              id: null, url: "", is_verified: false,
              _uid: crypto.randomUUID(),
            } as ParsedLink],
    }));
  };

  const toggleAddress = (e?: MouseEvent<HTMLButtonElement>) => {
    if (!profile.address_verified && e) {
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
    setDeletedField("address", !deletedFields.address);
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

  return (
    <div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
      <div className="w-full max-w-xl bg-transparent overflow-visible">
        {/* ZCASH ADDRESS */}
        <ProfileField
          label="Zcash Address"
          htmlFor="addr"
          helpText="Your Zcash address where verification codes are sent."
          isDeleted={deletedFields.address}
          deleteDisabled={!profile.address_verified}
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
            className={`${FIELD_CLASS} font-mono`}
          />
        </ProfileField>

        {/* USERNAME */}
        <ProfileField
          label="Username"
          htmlFor="name"
          helpText="Your unique handle on Zcash.me."
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
          {usernameConflict && (
            <p className="mt-1 text-xs text-red-600">{usernameConflict}</p>
          )}
          {!usernameConflict && usernameTouched && usernameInput && usernameStatus === "checking" && (
            <p className="mt-1 text-xs text-gray-500">Checking availability...</p>
          )}
          {!usernameConflict && usernameTouched && usernameInput && usernameStatus === "available" && (
            <p className="mt-1 text-xs text-green-600">This name is available.</p>
          )}
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
            placeholder={originals.display_name ?? "Enter display name"}
            onChange={(e) => handleChange("display_name", e.target.value)}
            className={FIELD_CLASS}
          />
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
            <textarea
              id="bio"
              rows={3}
              maxLength={100}
              value={form.bio}
              placeholder={originals.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              className={`${FIELD_CLASS} resize-none overflow-hidden pr-8 pb-6 relative text-left whitespace-pre-wrap break-words`}
            />
            <CharCounter text={form.bio} />
          </div>
        </ProfileField>

        {/* NEAREST CITY */}
        <ProfileField
          label="Nearest City"
          helpText="Select the city closest to you. This helps with regional discovery and relevance."
          isDeleted={deletedFields.nearest_city}
          deleteDisabled={!profile.nearest_city_name}
          onDelete={() => {
            setDeletedField('nearest_city', !deletedFields.nearest_city);
            setNearestCityDisplay("");
          }}
        >
          <CitySearchDropdown
            value={nearestCityDisplay}
            placeholder={
              !deletedFields.nearest_city && form.nearest_city_name && nearestCityDisplay === ""
                ? form.nearest_city_name
                : "Search nearest city…"
            }
            onChange={(val) => {
              if (typeof val === "string") {
                setNearestCityDisplay(val);
              } else {
                setNearestCityDisplay(val.fullLabel ?? "");
                updateField('nearest_city_name', val.fullLabel ?? "");
              }
            }}
          />
        </ProfileField>

        {/* PROFILE IMAGE URL */}
        <ProfileField
          label="Profile Image"
          htmlFor="pimg"
          helpText="Upload JPG/PNG/non-animated GIF (max 2 MB, recommended 400 x 400)."
          isDeleted={deletedFields.profile_image_url}
          deleteDisabled={!originals.profile_image_url}
          onDelete={toggleProfileImageDelete}
        >
          <input
            id="pimg"
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
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
            {pendingAvatarUpload && (
              <span className="text-xs text-gray-700">
                Pending: <span className="font-mono">{pendingAvatarUpload.fileName}</span> ({Math.round(pendingAvatarUpload.sizeBytes / 1024)} KB, {pendingAvatarUpload.width} x {pendingAvatarUpload.height}). This will upload after OTP verification.
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
                className={`font-semibold underline ${JSON.stringify(form.links.map(l => ({ id: l.id, url: l.url }))) !==
                  JSON.stringify(originalLinks.map(l => ({ id: l.id, url: l.url })))
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
          const original = originalLinks.find((o) => o.id === row.id) ?? {} as ParsedLink;
          const isVerified = !!row.is_verified;
          const currentUrl = (row.url ?? "").trim();

          const rowConflict =
            (!isVerified && row.valid === false) ||
            (isVerified && currentUrl.length > 0 && !isValidUrl(currentUrl).valid);
          const rowContainerClass = `${LINK_CONTAINER_CLASS} ${
            rowConflict ? "border-red-400" : "border-[#0a1126]/60"
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
                ) : row.id !== null && onAuthenticateLink ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    onClick={() => onAuthenticateLink({ url: row.url })}
                  >
                    Authenticate
                  </Button>
                ) : null}
              </div>
              <DeleteActionButton onClick={() => removeLink(row._uid)} />
            </div>
          );

          return (
            <div key={row._uid} className="mb-2">
              {isVerified ? (
                <div className={rowContainerClass}>
                  <LinkInput
                    value={row.url}
                    onChange={(v) => handleLinkChange(row._uid, v)}
                    readOnly={true}
                    placeholder={original?.url ?? "example.com"}
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
              onClick={onGenerateQr}
              className="hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
            >
              Start Verification
            </Button>
          </div>
        </div>

      </div>
      <p className="text-sm text-gray-400 text-center mt-4">
      </p>
    </div>
  );
}
