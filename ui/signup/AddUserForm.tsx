"use client";

import ZcashAddressInput from "@/ui/signup/ZcashAddressInput";
import { createPortal } from "react-dom";

import type { Profile } from "@/lib/profile/types";
import type { City } from "@/lib/directory/searchCitiesAction";
import { isValidSignupAddress, SIGNUP_ADDRESS_ERROR } from "@/lib/signup/addressValidation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SVGProps, FormEvent } from "react";
import {
  createProfileAction,
  insertProfileLinksAction,
  checkUsernameAvailabilityAction,
} from "@/lib/signup/createProfileAction";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CitySearchDropdown from "@/ui/signup/CitySearchDropdown";
import StepContainer from "@/ui/signup/StepContainer";
import FormField from "@/ui/common/forms/FormField";

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

import { isValidUrl, normalizeUrl } from "@/lib/profile/urlValidation";
import { normalizeSocialUsername, buildSocialUrl } from "@/lib/profile/usernameNormalizer";
import type { SocialPlatform } from "@/lib/profile/usernameNormalizer";
import { sanitizeUsernameInput, normalizeUsernameForSlug } from "@/lib/profile/usernamePolicy";
import { PROTECTED_NAME_SIGNUP_ERROR } from "@/lib/zns/name";
import SocialLinkInput from "@/ui/signup/SocialLinkInput";
import {
  PROFILE_CARD_ICON_BUTTON_CLASSES,
  PROFILE_CARD_MODAL_CHROME_CLASSES,
  PROFILE_CARD_PRIMARY_GREEN_ACTION_BUTTON_CLASSES,
  PROFILE_CARD_SECONDARY_ACTION_BUTTON_CLASSES,
  getProfileCardTapMotionProps,
} from "@/ui/common/buttons/styles";
import { withFieldBorderState, withFieldFocusWithinBorderState } from "@/ui/common/forms/styles";

const MAX_DISPLAY_NAME_LENGTH = 32;

function validateDisplayName(value: string): { valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: "Display name is required." };
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

interface SocialLink {
  platform: string;
  username: string;
  otherUrl: string;
  valid: boolean;
}

interface ConflictInfo {
  type: "error" | "info";
  text: string;
}

interface AddUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: (_profile: Profile) => void;
  prefillUsername?: string | null;
}

export default function AddUserForm({
  isOpen,
  onClose,
  onUserAdded,
  prefillUsername = null,
}: AddUserFormProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [nameHelp, setNameHelp] = useState("");
  const [nameConflict, setNameConflict] = useState<ConflictInfo | null>(null);
  const [address, setAddress] = useState("");


  const [nearestCity, setNearestCity] = useState<City | null>(null);
  const [nearestCityInput, setNearestCityInput] = useState("");

  const [links, setLinks] = useState<SocialLink[]>([{ platform: "X", username: "", otherUrl: "", valid: true }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const tapProps = getProfileCardTapMotionProps(shouldReduceMotion);
  const totalSteps = 5;
  const addressStepIndex = 1;
  const linksStepIndex = 2;
  const cityStepIndex = 3;
  const reviewStepIndex = 4;



  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setDir(1);
    setName(prefillUsername || "");
    setDisplayName("");
    setNameHelp("");
    setNameConflict(null);
    setAddress("");
    setNearestCity(null);
    setNearestCityInput("");
    setLinks([{ platform: "X", username: "", otherUrl: "", valid: true }]);
    setError("");
    setIsLoading(false);
  }, [isOpen, prefillUsername]);

  useEffect(() => {
    if (!name) {
      setNameConflict(null);
      setNameHelp("");
      return;
    }

    let active = true;

    const checkName = async () => {
      const trimmedName = sanitizeUsernameInput(name);
      const availabilityResult = await checkUsernameAvailabilityAction(trimmedName);

      if (!active) return;

      if (availabilityResult.ok && availabilityResult.protected) {
        setNameConflict({
          type: "error",
          text: PROTECTED_NAME_SIGNUP_ERROR,
        });
        setNameHelp("Username unavailable");
        return;
      }

      if (availabilityResult.ok && availabilityResult.zns_owned) {
        setNameConflict({
          type: "error",
          text: "This Zcash Name has already been claimed. Choose another username.",
        });
        setNameHelp("Username unavailable");
        return;
      }

      if (availabilityResult.ok && availabilityResult.exists) {
        if (availabilityResult.verified_exists) {
          setNameConflict({
            type: "error",
            text: "That name is already used by a verified profile.",
          });
        } else {
          setNameConflict({
            type: "info",
            text: "That name is used by an unverified profile(s). You can still proceed.",
          });
        }
      } else {
        setNameConflict(null);
      }

      const slug = normalizeUsernameForSlug(trimmedName);
      const waitlistCount = availabilityResult.waitlist_count ?? 0;
      if (
        availabilityResult.ok &&
        !availabilityResult.protected &&
        !availabilityResult.zns_owned &&
        !availabilityResult.verified_exists
      ) {
        if (waitlistCount === 0) {
          setNameHelp(`Profile URL: Zcash.me/${slug}-[id]`);
        } else {
          setNameHelp(
            `${waitlistCount} ${waitlistCount === 1 ? "person is" : "people are"} already waiting for this Zcash Name. Profile URL: Zcash.me/${slug}-[id]`
          );
        }
      } else {
        setNameHelp(`Profile URL: Zcash.me/${slug}-[id]`);
      }
    };

    const timer = setTimeout(checkName, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  function handleClose() {
    onClose();
  }

  function updateLink(index: number, patch: Partial<SocialLink>) {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addLinkField() {
    setLinks([...links, { platform: "X", username: "", otherUrl: "", valid: true }]);
  }

  function removeLinkField(index: number) {
    setLinks(links.filter((_, i) => i !== index));
  }

  const reviewLinks = [
    ...links
      .map((l) => {
        if (l.platform === "Other") {
          return l.otherUrl?.trim() || "";
        }
        return buildSocialUrl(l.platform as SocialPlatform, (l.username || "").trim()) || "";
      })
      .filter((url) => {
        if (!url) return false;
        const res = isValidUrl(url);
        return res.valid;
      }),
  ];

  const stepIsValid = (() => {
    if (step === 0) {
      return !!name.trim() && validateDisplayName(displayName).valid && nameConflict?.type !== "error";
    }
    if (step === addressStepIndex) return isValidSignupAddress(address);
    if (step === linksStepIndex) return links.every((link) => link.valid !== false);
    if (step === cityStepIndex) return true;
    if (step === reviewStepIndex) {
      return !!name.trim() && validateDisplayName(displayName).valid &&
        isValidSignupAddress(address) && nameConflict?.type !== "error";
    }
    return false;
  })();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!isValidSignupAddress(address)) {
      setError(SIGNUP_ADDRESS_ERROR);
      return;
    }

    const invalid = links.some((l) => {
      if (l.platform === "Other") {
        return l.otherUrl && !isValidUrl(l.otherUrl.trim());
      } else {
        if (!l.username) return false;
        const built = buildSocialUrl(l.platform as SocialPlatform, l.username.trim()) || "";
        const res = isValidUrl(built);
        return !(built && res.valid);
      }
    });
    if (invalid) {
      setError("One or more links are invalid. Please fix them before continuing.");
      return;
    }

    const trimmedName = sanitizeUsernameInput(name);
    const usernameAvailabilityResult = await checkUsernameAvailabilityAction(trimmedName);

    if (usernameAvailabilityResult.ok && usernameAvailabilityResult.protected) {
      setError(PROTECTED_NAME_SIGNUP_ERROR);
      return;
    }

    if (usernameAvailabilityResult.ok && usernameAvailabilityResult.zns_owned) {
      setError("This Zcash Name has already been claimed. Choose another username.");
      return;
    }

    if (usernameAvailabilityResult.ok && usernameAvailabilityResult.verified_exists) {
      setError(
        "That name is already used by a verified profile."
      );
      return;
    }

    const toPrettyDomain = (rawUrl: string) => {
      const trimmed = (rawUrl || "").trim();
      if (!trimmed) return "";
      const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      try {
        const host = new URL(normalized).hostname || "";
        return host.replace(/^www\./i, "") || trimmed;
      } catch {
        return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      }
    };

    const canonicalizeHttpsUrl = (rawUrl: string): string | null => {
      const trimmed = (rawUrl || "").trim();
      if (!trimmed) return null;
      const normalized = normalizeUrl(trimmed);
      try {
        return new URL(normalized).toString();
      } catch {
        return null;
      }
    };

    const finalLinkEntries = links
      .map((l) => {
        if (l.platform === "Other") {
          const rawUrl = l.otherUrl?.trim() || "";
          const res = isValidUrl(rawUrl);
          if (!rawUrl || !res.valid) return null;
          const canonicalUrl = canonicalizeHttpsUrl(rawUrl);
          if (!canonicalUrl) return null;
          return {
            url: canonicalUrl,
            label: toPrettyDomain(canonicalUrl),
            platform: "Other",
          };
        }
        if (!l.username) return null;
        const url = buildSocialUrl(l.platform as SocialPlatform, l.username.trim()) || "";
        const res = isValidUrl(url);
        if (!url || !res.valid) return null;
        const label =
          l.platform === "Discord"
            ? l.username.trim()
            : normalizeSocialUsername(l.username.trim(), l.platform as SocialPlatform);
        return { url, label, platform: l.platform };
      })
      .filter(Boolean) as { url: string; label: string; platform: string }[];

    setIsLoading(true);

    try {
      const profileResult = await createProfileAction({
        name: sanitizeUsernameInput(name),
        display_name: displayName.trim() || undefined,
        address: address.trim(),
        nearest_city_name: nearestCity
          ? [nearestCity.city_ascii || nearestCity.city, nearestCity.admin_name, nearestCity.country].filter(Boolean).join(", ")
          : undefined,
        country: nearestCity?.country || undefined,
        iso2: nearestCity?.iso2 || undefined,
        created_at: new Date().toISOString(),
      });

      if (!profileResult.ok || !profileResult.data) {
        setError(profileResult.error || "Failed to create profile");
        setIsLoading(false);
        return;
      }

      const profile = profileResult.data;

      const linksResult = await insertProfileLinksAction(profile.id, finalLinkEntries);
      if (!linksResult.ok) {
        // Continue anyway - profile is created
      }




      const slugBase = normalizeUsernameForSlug(profile.name);
      const slug = `${slugBase}-${profile.id}`;

      onUserAdded?.(profile);
      onClose?.();

      router.push(`/${slug}`);




    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes("duplicate key value") || errorMessage.includes("already exists")) {
        setError("That username is already taken. Please choose a unique one.");
      } else {
        setError(errorMessage || "Failed to add name.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const goNext = () => {
    if (!stepIsValid) return;
    setDir(1);
    setStep((s) => Math.min(reviewStepIndex, s + 1));
  };
  const goBack = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const StepName = (
    <StepContainer stepKey="step-name" dir={dir}>
      <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wide text-gray-700 mb-1">
        Username
      </label>
      <div
        className={`flex items-center w-full rounded-2xl border overflow-hidden bg-transparent ${
          withFieldFocusWithinBorderState("border-black/30", nameConflict?.type === "error")
        }`}
      >
        <span className="pl-3 pr-1 text-sm text-gray-600 select-none whitespace-nowrap">Zcash.me/</span>
        <input
          id="name"
          autoFocus
          value={name}
          onChange={(e) => {
            const filtered = sanitizeUsernameInput(e.target.value);
            setName(filtered);
          }}
          className="flex-1 px-1 py-2 text-sm outline-hidden bg-transparent"
          placeholder="username"
          autoComplete="off"
        />
      </div>
      <p
        className={`mt-1 text-xs ${nameConflict?.type === "error"
          ? "text-red-600"
          : nameConflict?.type === "info"
            ? "text-green-600"
            : "text-gray-600"
          }`}
      >
        {nameConflict?.text
          ? nameConflict.text
          : nameHelp || "Use lowercase letters and numbers only, 1–62 characters."}
      </p>

      {/* Display Name */}
      <label htmlFor="displayName" className="block text-xs font-medium uppercase tracking-wide text-gray-700 mb-1 mt-4">
        Display Name
      </label>
      <input
        id="displayName"
        value={displayName}
        onChange={(e) => {
          const newValue = e.target.value;
          setDisplayName(newValue);
          const validation = validateDisplayName(newValue);
          setDisplayNameError(validation.valid ? null : validation.error || null);
        }}
        className={`w-full rounded-2xl border px-3 py-2 text-sm outline-hidden bg-transparent ${withFieldBorderState("border-black/30", !!displayNameError)}`}
        placeholder="Enter display name"
        autoComplete="off"
        maxLength={MAX_DISPLAY_NAME_LENGTH + 5}
      />
      <p className={`mt-1 text-xs ${displayNameError ? "text-red-600" : "text-gray-600"}`}>
        {displayNameError || "Shown on your profile instead of your username."}
      </p>

      {/* Short Bio disabled during signup */}
      {/*
      <label htmlFor="bio" className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1 mt-4">
        Short Bio
      </label>
      <textarea
        id="bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        className={`w-full rounded-2xl border px-3 py-2 text-sm outline-hidden bg-transparent min-h-[88px] resize-none ${withFieldBorderState("border-black/30")}`}
        placeholder="Tell people what you are about"
      />
      */}

    </StepContainer>
  );



  const StepAddress = (
    <StepContainer stepKey="step-address" dir={dir}>
      <ZcashAddressInput
        value={address}
        onChange={setAddress}
      />


      <p className="mt-4 text-xs text-gray-600">
        <span className="font-bold text-gray-800">Did you know?</span> This Zcash address and its activity cannot be found on-chain.
      </p>
    </StepContainer>
  );

  const StepCity = (
    <StepContainer stepKey="step-city" dir={dir}>
      <FormField label="Nearest City" htmlFor="nearest-city" labelClassName="block text-xs font-medium uppercase tracking-wide text-gray-700" className="mb-0">
        <div className="relative w-full">
          <CitySearchDropdown
            value={nearestCityInput}
            onChange={(val) => {
              if (typeof val === "string") {
                setNearestCityInput(val);
                setNearestCity(null);
              } else {
                setNearestCity(val);

                const pretty = [
                  val.city_ascii || val.city,
                  val.admin_name,
                  val.country,
                ].filter(Boolean).join(", ");

                setNearestCityInput(pretty);

              }
            }}
            placeholder="Type to search city…"
          />
        </div>
      </FormField>

      <p className="mt-1 text-xs text-gray-600">
        Optional. Helps Zcashers find other Zcashers around them.
      </p>
    </StepContainer>
  );

  const StepLinks = (
    <StepContainer stepKey="step-links" dir={dir}>
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-700 mb-1">Add social links to help others identify you</label>


      {links.map((link, index) => (
        <SocialLinkInput
          key={index}
          value={link}
          onChange={(nextValue) => updateLink(index, nextValue)}
          allowRemove={links.length > 1}
          onRemove={() => removeLinkField(index)}
        />
      ))}
      <button type="button" onClick={addLinkField} className="text-sm font-semibold text-green-700 hover:underline mt-1">
        ＋ Add more links
      </button>
      <p className="mt-2 text-xs text-gray-600">
        Tip: You can authenticate links from Edit Profile after verifying your Zcash address.
      </p>
    </StepContainer>
  );

  const StepReview = (
    <StepContainer stepKey="step-review" dir={dir}>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold text-gray-800">Username:</span>{" "}
          <span className="font-mono">{name || "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-800">Display Name:</span>{" "}
          <span className="font-mono">{displayName || "—"}</span>
        </div>
        {/* Short Bio disabled during signup */}
        <div>
          <span className="font-semibold text-gray-800">Zcash Address:</span>{" "}
          <span className="font-mono break-all">{address || "—"}</span>
        </div>

        <div>
          <span className="font-semibold text-gray-800">Nearest City:</span>{" "}
          <span>{nearestCity?.city_ascii || nearestCity?.city || "—"}</span>

        </div>
        <div>
          <span className="font-semibold text-gray-800">Links:</span>
          {reviewLinks.length ? (
            <ul className="mt-1 list-disc list-inside space-y-1">
              {reviewLinks.map((u, i) => (
                <li key={i} className="font-mono break-all">
                  {u}
                </li>
              ))}
            </ul>
          ) : (
            <span> —</span>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-600">
        By submitting, you agree that these items will be listed publicly. You can add and remove items later.
      </p>
    </StepContainer>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center pt-[10vh] sm:pt-0 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md animate-fadeIn ${PROFILE_CARD_MODAL_CHROME_CLASSES}`}
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-[26px] border-b border-black/10">
          {/* Progress Bar Background */}
          <div
            className="absolute top-0 left-0 bottom-0 transition-all duration-700 ease-in-out opacity-80"
            style={{
              width: `${((step + 1) / totalSteps) * 100}%`,
              backgroundImage: 'linear-gradient(90deg, #fde047, #4ade80, #22c55e, #fde047)',
              backgroundSize: '200% 100%',
              animation: 'slideGradient 15s linear infinite'
            }}
          />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">Zcash is better with friends</h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-800 mt-0.5">
                Step {step + 1} of {totalSteps}
              </p>
            </div>
            <motion.button
              type="button"
              onClick={handleClose}
              {...tapProps}
              className={`${PROFILE_CARD_ICON_BUTTON_CLASSES} h-8 w-8`}
              aria-label="Close"
            >
              <XIcon className="w-4 h-4 text-gray-700" />
            </motion.button>
          </div>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (step < reviewStepIndex && stepIsValid) {
                goNext();
              }

            }
          }}
          className="px-5 py-4 space-y-4"
        >
          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
          )}

          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            {step === 0 && StepName}
            {step === addressStepIndex && StepAddress}
            {step === linksStepIndex && StepLinks}
            {step === cityStepIndex && StepCity}
            {step === reviewStepIndex && StepReview}
          </AnimatePresence>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-black/10">
          <div className="flex-1">
            {step > 0 ? (
              <motion.button
                type="button"
                onClick={goBack}
                {...tapProps}
                className={"w-full " + PROFILE_CARD_SECONDARY_ACTION_BUTTON_CLASSES}
              >
                ← Back
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={handleClose}
                {...tapProps}
                className={"w-full " + PROFILE_CARD_SECONDARY_ACTION_BUTTON_CLASSES}
              >
                Cancel
              </motion.button>
            )}
          </div>

          <div className="flex-1">
            {step < reviewStepIndex ? (
              <motion.button
                type="button"
                onClick={goNext}
                disabled={!stepIsValid}
                title={!stepIsValid && nameConflict?.type === "error" ? "This name is already used by a verified profile." : ""}
                {...tapProps}
                className={"w-full " + PROFILE_CARD_PRIMARY_GREEN_ACTION_BUTTON_CLASSES}
              >
                Next →
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !stepIsValid}
                {...tapProps}
                className={"w-full " + PROFILE_CARD_PRIMARY_GREEN_ACTION_BUTTON_CLASSES}
              >
                {isLoading ? "Adding..." : "Add Name"}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideGradient {
          0% { background-position: 0% 0%; }
          100% { background-position: -200% 0%; }
        }
        .animate-fadeIn { animation: fadeIn .25s ease-out; }
      `}</style>
    </div>,
    document.body
  );
}


