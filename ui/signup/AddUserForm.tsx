"use client";

import ZcashAddressInput from "@/ui/signup/ZcashAddressInput";
import { createPortal } from "react-dom";

import type { Profile } from "@/lib/profile/types";
import type { City } from "@/lib/directory/searchCitiesAction";
import { validateZcashAddress } from "./zcashAddress";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SVGProps, FormEvent } from "react";
import {
  createProfileAction,
  insertProfileLinksAction,
  insertVerifiedSignupDiscordLinkAction,
  checkAddressTakenAction,
  checkUsernameAvailabilityAction,
} from "@/lib/signup/createProfileAction";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
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
import SocialLinkInput from "@/ui/signup/SocialLinkInput";
import {
  PROFILE_CARD_ICON_BUTTON_CLASSES,
  PROFILE_CARD_MODAL_CHROME_CLASSES,
  PROFILE_CARD_PRIMARY_GREEN_ACTION_BUTTON_CLASSES,
  PROFILE_CARD_SECONDARY_ACTION_BUTTON_CLASSES,
  getProfileCardTapMotionProps,
} from "@/ui/common/buttons/styles";
import { withFieldBorderState, withFieldFocusWithinBorderState } from "@/ui/common/forms/styles";
import { supabase } from "@/lib/supabase/supabase-client";
import { connectDiscordForNsSignup, clearPendingNsSignupDiscord, getPendingNsSignupDiscord } from "@/ui/links/nsSignupDiscord";
import { getProviderByKey } from "@/ui/links/providers";

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

interface Referrer {
  id: number;
  name: string;
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

interface DiscordSignupIdentity {
  userId: string;
  label: string;
  url: string;
}

interface NsSignupDraft {
  step: number;
  name: string;
  displayName: string;
  address: string;
  referrer: Referrer | string;
  nearestCity: City | null;
  nearestCityInput: string;
  links: SocialLink[];
  discordIdentity: DiscordSignupIdentity | null;
}

const NS_SIGNUP_DRAFT_KEY = "nsSignupJoinDraft";

function loadNsSignupDraft(): NsSignupDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(NS_SIGNUP_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NsSignupDraft;
  } catch {
    sessionStorage.removeItem(NS_SIGNUP_DRAFT_KEY);
    return null;
  }
}

function saveNsSignupDraft(draft: NsSignupDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NS_SIGNUP_DRAFT_KEY, JSON.stringify(draft));
}

function clearNsSignupDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NS_SIGNUP_DRAFT_KEY);
}

interface AddUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: (_profile: Profile) => void;
  prefillUsername?: string | null;
  prefillReferrer?: string | null;
  prefillReferrerId?: number | null;
  isNsSignup?: boolean;
}

export default function AddUserForm({
  isOpen,
  onClose,
  onUserAdded,
  prefillUsername = null,
  prefillReferrer = null,
  prefillReferrerId = null,
  isNsSignup = false,
}: AddUserFormProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [nameHelp, setNameHelp] = useState("");
  const [nameConflict, setNameConflict] = useState<ConflictInfo | null>(null);
  const [address, setAddress] = useState("");
  const [addressHelp, setAddressHelp] = useState("");
  const [addressConflict, setAddressConflict] = useState<ConflictInfo | null>(null);
  const [referrerConflict, setReferrerConflict] = useState<ConflictInfo | null>(null);

  const [referrer, setReferrer] = useState<Referrer | string>("");

  const [nearestCity, setNearestCity] = useState<City | null>(null);
  const [nearestCityInput, setNearestCityInput] = useState("");

  const [links, setLinks] = useState<SocialLink[]>([{ platform: "X", username: "", otherUrl: "", valid: true }]);
  const [discordIdentity, setDiscordIdentity] = useState<DiscordSignupIdentity | null>(null);
  const [isDiscordAuthLoading, setIsDiscordAuthLoading] = useState(false);
  const [discordAuthError, setDiscordAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const tapProps = getProfileCardTapMotionProps(shouldReduceMotion);
  const totalSteps = isNsSignup ? 7 : 6;
  const addressStepIndex = 1;
  const discordStepIndex = isNsSignup ? 2 : -1;
  const linksStepIndex = isNsSignup ? 3 : 2;
  const cityStepIndex = isNsSignup ? 4 : 3;
  const referrerStepIndex = isNsSignup ? 5 : 4;
  const reviewStepIndex = isNsSignup ? 6 : 5;



  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const nsDraft = isNsSignup ? loadNsSignupDraft() : null;
      if (nsDraft) {
        setStep(Math.min(reviewStepIndex, Math.max(0, nsDraft.step || 0)));
        setDir(1);
        setName(nsDraft.name || "");
        setDisplayName(nsDraft.displayName || "");
        setNameHelp("");
        setNameConflict(null);
        setAddress(nsDraft.address || "");
        setAddressHelp("");
        setAddressConflict(null);
        setReferrer(nsDraft.referrer || "");
        setReferrerConflict(null);
        setNearestCity(nsDraft.nearestCity || null);
        setNearestCityInput(nsDraft.nearestCityInput || "");
        setLinks(nsDraft.links?.length ? nsDraft.links : [{ platform: "X", username: "", otherUrl: "", valid: true }]);
        setDiscordIdentity(nsDraft.discordIdentity || null);
        setDiscordAuthError(null);
        setIsDiscordAuthLoading(false);
        setError("");
        setIsLoading(false);
        return;
      }

      setStep(0);
      setDir(1);
      setName(prefillUsername || "");
      setDisplayName("");
      setNameHelp("");
      setNameConflict(null);
      setAddress("");
      setAddressHelp("");
      setAddressConflict(null);
      if (prefillReferrerId && prefillReferrer) {
        setReferrer({ id: prefillReferrerId, name: prefillReferrer });
      } else {
        setReferrer(prefillReferrer || "");
      }
      setReferrerConflict(null);
      setNearestCity(null);
      setNearestCityInput("");
      setLinks([{ platform: "X", username: "", otherUrl: "", valid: true }]);
      setDiscordIdentity(null);
      setDiscordAuthError(null);
      setIsDiscordAuthLoading(false);
      setError("");
      setIsLoading(false);
    })();
  }, [isOpen, isNsSignup, prefillReferrer, prefillReferrerId, prefillUsername, reviewStepIndex]);

  useEffect(() => {
    if (!isOpen || !isNsSignup) return;
    saveNsSignupDraft({
      step,
      name,
      displayName,
      address,
      referrer,
      nearestCity,
      nearestCityInput,
      links,
      discordIdentity,
    });
  }, [isOpen, isNsSignup, step, name, displayName, address, referrer, nearestCity, nearestCityInput, links, discordIdentity]);

  useEffect(() => {
    if (!isOpen || !isNsSignup) return;
    if (!getPendingNsSignupDiscord()) return;

    const discordProvider = getProviderByKey("discord");
    if (!discordProvider) {
      setDiscordAuthError("Discord login is temporarily unavailable.");
      setIsDiscordAuthLoading(false);
      return;
    }

    let active = true;
    const resolveDiscordIdentity = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const session = data.session;
      if (!session) {
        setIsDiscordAuthLoading(false);
        return;
      }

      const identity = session.user.identities?.find((item) => item.provider === discordProvider.key);
      const identityData = identity?.identity_data as Record<string, unknown> | undefined;
      const userId = identityData ? discordProvider.getHandle(identityData) : null;
      if (!userId) {
        setDiscordAuthError("Discord login did not return a usable account. Try again.");
        setIsDiscordAuthLoading(false);
        return;
      }

      const label =
        (identityData ? discordProvider.getUsername?.(identityData) : null) ||
        (identityData?.full_name as string | undefined) ||
        userId;

      setDiscordIdentity({
        userId,
        label,
        url: discordProvider.buildUrl(userId),
      });
      setDiscordAuthError(null);
      setIsDiscordAuthLoading(false);
      clearPendingNsSignupDiscord();
    };

    setIsDiscordAuthLoading(true);
    void resolveDiscordIdentity();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return;
      const identity = session.user.identities?.find((item) => item.provider === discordProvider.key);
      const identityData = identity?.identity_data as Record<string, unknown> | undefined;
      const userId = identityData ? discordProvider.getHandle(identityData) : null;
      if (!userId) return;
      const label =
        (identityData ? discordProvider.getUsername?.(identityData) : null) ||
        (identityData?.full_name as string | undefined) ||
        userId;
      setDiscordIdentity({
        userId,
        label,
        url: discordProvider.buildUrl(userId),
      });
      setDiscordAuthError(null);
      setIsDiscordAuthLoading(false);
      clearPendingNsSignupDiscord();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isOpen, isNsSignup]);

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

      if (availabilityResult.ok && availabilityResult.exists) {
        if (availabilityResult.verified_exists) {
          setNameConflict({
            type: "error",
            text: "That name is already used by a verified profile.",
          });
        } else {
          setNameConflict({
            type: "info",
            text: "That name is used by an unverified profile(s). You can still proceed. Verify to secure this Zcash.me name for yourself.",
          });
        }
      } else {
        setNameConflict(null);
      }

      setNameHelp(`Shared as: Zcash.me/${normalizeUsernameForSlug(trimmedName)}`);
    };

    const timer = setTimeout(checkName, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name]);

  useEffect(() => {
    const addrNorm = address.trim().toLowerCase();
    const res = validateZcashAddress(addrNorm);

    if (!address) {
      setAddressHelp("Enter your Zcash address (t1…, zs1…, or u1…).");
      setAddressConflict(null);
      return;
    }

    let active = true;

    const checkAddr = async () => {
      const result = await checkAddressTakenAction(address);

      if (!active) return;

      if (result.ok && result.taken) {
        setAddressConflict({
          type: "error",
          text: "That Zcash address is already associated with an existing profile. Generate a new one — it's free — and try again.",
        });
        setAddressHelp("");
        return;
      } else {
        setAddressConflict(null);
      }

      if (!res.valid) {
        setAddressHelp(
          "Invalid address. Must be transparent (t1…), Sapling (zs1…), or Unified (u1…)."
        );
        setAddressConflict(null);
        return;
      }

      if (res.type === "tex") {
        setAddressHelp(
          "That's a TEX (transparent-source-only) address defined in ZIP 320. It can't receive from shielded senders. Use a z- or u- address instead."
        );
        setAddressConflict({
          type: "info",
          text: "TEX addresses are valid but not supported for shielded transactions.",
        });
        return;
      }

      const label =
        res.type === "transparent"
          ? "Transparent address ✓ (Note: exposes sender, receiver, and amount on-chain)"
          : res.type === "sapling"
            ? "Sapling address ✓"
            : res.type === "unified"
              ? "Looks good — valid Unified address ✓"
              : "Valid address ✓";

      setAddressHelp(label);
      setAddressConflict(null);
    };

    const timer = setTimeout(checkAddr, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [address]);

  useEffect(() => {
    if (typeof referrer === "object") {
      setReferrerConflict(null);
      return;
    }

    const query = (referrer || "").trim();
    if (!query) {
      setReferrerConflict(null);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailabilityAction(query);
      if (!active) return;
      if (result.ok && !result.exists) {
        setReferrerConflict({
          type: "error",
          text: "No matching username found. Select a valid referrer or clear this field.",
        });
      } else {
        setReferrerConflict(null);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [referrer]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  function handleClose() {
    if (isNsSignup) {
      clearNsSignupDraft();
      clearPendingNsSignupDiscord();
      setDiscordIdentity(null);
      setDiscordAuthError(null);
      setIsDiscordAuthLoading(false);
    }
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
    ...(discordIdentity ? [discordIdentity.url] : []),
    ...links
      .filter((l) => !(isNsSignup && l.platform === "Discord"))
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
    switch (step) {
      case 0: {
        const displayNameValidation = validateDisplayName(displayName);
        return !!name.trim() && displayNameValidation.valid && (!nameConflict || nameConflict.type !== "error");
      }


      case 1: {
        const res = validateZcashAddress(address.trim());
        if (addressConflict?.type === "error") return false;
        if (res.type === "tex" || res.type === "transparent") return false;
        return !!address.trim() && res.valid;
      }


      case 2:
        if (isNsSignup) return !!discordIdentity && !isDiscordAuthLoading;
        return links.every((l) => l.valid !== false);
      case 3:
        if (isNsSignup) return links.every((l) => l.valid !== false);
        return true;
      case 4:
        return true;
      case 5: {
        if (isNsSignup) return true;
        const res = validateZcashAddress(address.trim());
        return (
          !!name.trim() &&
          !!address.trim() &&
          (!nameConflict || nameConflict.type !== "error") &&
          (!addressConflict || addressConflict.type !== "error") &&
          res.valid &&
          res.type !== "tex" &&
          res.type !== "transparent"
        );
      }
      case 6: {
        const res = validateZcashAddress(address.trim());
        return (
          !!discordIdentity &&
          !!name.trim() &&
          !!address.trim() &&
          (!nameConflict || nameConflict.type !== "error") &&
          (!addressConflict || addressConflict.type !== "error") &&
          res.valid &&
          res.type !== "tex" &&
          res.type !== "transparent"
        );
      }



      default:
        return false;
    }
  })();


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (isNsSignup && !discordIdentity) {
      setError("Log in with Discord to continue.");
      return;
    }

    const invalid = links.some((l) => {
      if (isNsSignup && l.platform === "Discord") {
        return false;
      }
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

    if (usernameAvailabilityResult.ok && usernameAvailabilityResult.verified_exists) {
      setError(
        'That name is already used by a verified profile. Spaces are treated as underscores and casing is ignored.'
      );
      return;
    }

    const addr = address.trim().toLowerCase();
    const addressTakenResult = await checkAddressTakenAction(addr);

    if (addressTakenResult.ok && addressTakenResult.taken) {
      setError("That address is already associated with an existing profile.");
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
        if (isNsSignup && l.platform === "Discord") {
          return null;
        }
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
        referred_by:
          typeof referrer === "object"
            ? referrer?.name || undefined
            : (referrer || "").trim() || undefined,
        referred_by_zcasher_id: typeof referrer === "object" ? referrer?.id || undefined : undefined,
        is_ns: isNsSignup || undefined,
        created_at: new Date().toISOString(),
      });

      if (!profileResult.ok || !profileResult.data) {
        setError(profileResult.error || "Failed to create profile");
        setIsLoading(false);
        return;
      }

      const profile = profileResult.data;

      if (isNsSignup && discordIdentity) {
        await insertVerifiedSignupDiscordLinkAction(profile.id, {
          url: discordIdentity.url,
          label: discordIdentity.label,
          platform: "Discord",
        });
      }

      const linksResult = await insertProfileLinksAction(profile.id, finalLinkEntries);
      if (!linksResult.ok) {
        // Continue anyway - profile is created
      }




      const slugBase = normalizeUsernameForSlug(profile.name);
      const slug = `${slugBase}-${profile.id}`;

      onUserAdded?.(profile);
      if (isNsSignup) {
        clearNsSignupDraft();
        clearPendingNsSignupDiscord();
      }
      onClose?.();

      router.push(`/${slug}`);




    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      if (errorMessage.includes("duplicate key value") || errorMessage.includes("already exists")) {
        setError("That address or name already exists. Please choose a unique one.");
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

    setAddressConflict(null);
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
          : nameHelp || "Use letters, numbers, or underscores. Spaces become underscores."}
      </p>
      {addressConflict && (
        <p
          className={`mt-1 text-xs ${addressConflict?.type === "error"
            ? "text-red-600"
            : addressConflict?.type === "info"
              ? "text-green-600"
              : "text-gray-700"
            }`}
        >
          {addressConflict?.text || ""}
        </p>
      )}

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
        hasConflict={addressConflict?.type === "error"}
      />
      {(addressConflict || addressHelp) && (
        <p
          className={`mt-1 text-xs ${addressConflict?.type === "error"
            ? "text-red-600"
            : addressConflict?.type === "info"
              ? "text-green-600"
              : "text-gray-700"
            }`}
        >
          {typeof addressConflict === "object"
            ? addressConflict?.text
            : typeof addressConflict === "string"
              ? addressConflict
              : addressHelp}
        </p>
      )}


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

  const StepDiscord = isNsSignup ? (
    <StepContainer stepKey="step-discord" dir={dir}>
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-700 mb-1">
        Log in with Discord
      </label>
      <p className="text-sm text-gray-700">
        Network School signup requires Discord verification before optional socials.
      </p>
      <div className="mt-4 rounded-2xl border border-black/20 bg-white/70 p-4">
        {discordIdentity ? (
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-green-700">Discord connected</p>
            <p>
              <span className="font-semibold text-gray-800">Display name:</span>{" "}
              <span className="font-mono">{discordIdentity.label}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-800">User ID:</span>{" "}
              <span className="font-mono break-all">{discordIdentity.userId}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              This adds your canonical Discord profile link and marks it authenticated during signup.
            </p>
            <motion.button
              type="button"
              onClick={async () => {
                setDiscordAuthError(null);
                setIsDiscordAuthLoading(true);
                try {
                  await connectDiscordForNsSignup("/ns");
                } catch (err: any) {
                  setDiscordAuthError(err?.message || "Discord login failed. Try again.");
                  setIsDiscordAuthLoading(false);
                }
              }}
              disabled={isDiscordAuthLoading}
              {...tapProps}
              className={"w-full " + PROFILE_CARD_PRIMARY_GREEN_ACTION_BUTTON_CLASSES}
            >
              {isDiscordAuthLoading ? "Connecting..." : "Log in with Discord"}
            </motion.button>
          </div>
        )}
        {discordAuthError && (
          <p className="mt-3 text-xs text-red-600">{discordAuthError}</p>
        )}
        {!discordIdentity && !discordAuthError && (
          <p className="mt-3 text-xs text-gray-600">
            If the Discord redirect is cancelled, reopen this step and try again.
          </p>
        )}
      </div>
    </StepContainer>
  ) : null;

  const StepReferrer = (
    <StepContainer stepKey="step-ref" dir={dir}>
      <label htmlFor="referrer" className="block text-xs font-medium uppercase tracking-wide text-gray-700 mb-1">
        Referred by Zcash.me/
      </label>

      <div
        className={`relative flex items-center w-full rounded-2xl border overflow-visible bg-transparent ${
          withFieldFocusWithinBorderState("border-black/30", referrerConflict?.type === "error")
        }`}
      >
        <span className="pl-3 pr-1 text-sm text-gray-600 select-none whitespace-nowrap">Zcash.me/</span>
        <div className="relative flex-1">
          <ProfileSearchDropdown
            value={typeof referrer === "object" ? referrer?.name || "" : referrer || ""}
            onChange={(v) => {
              setReferrer(v);
              if (typeof v === "object") {
                setReferrerConflict(null);
              }
            }}
            placeholder="username"
            showUsernameAvailability={false}
            className="w-full px-1 py-2 text-sm outline-hidden bg-transparent"
          />
        </div>
      </div>

      <p className={`mt-1 text-xs ${referrerConflict?.type === "error" ? "text-red-600" : "text-gray-600"}`}>
        {referrerConflict?.text || "Optional. Helps us reward members who refer new members."}
      </p>
    </StepContainer>
  );

  const StepLinks = (
    <StepContainer stepKey="step-links" dir={dir}>
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-700 mb-1">Add social links to help others identify you</label>

      {isNsSignup && discordIdentity && (
        <div className="mb-3 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-800">
          Discord is already added. Feel free to add another.
        </div>
      )}

      {links.map((link, index) => (
        <SocialLinkInput
          key={index}
          value={link}
          onChange={(nextValue) => updateLink(index, nextValue)}
          allowRemove={links.length > 1}
          onRemove={() => removeLinkField(index)}
          excludePlatforms={isNsSignup ? ["Discord"] : []}
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
          <span className="font-semibold text-gray-800">Referred by:</span>{" "}
          <span>{typeof referrer === "object" ? referrer?.name || "—" : "—"}</span>
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
            {isNsSignup && step === discordStepIndex && StepDiscord}
            {step === linksStepIndex && StepLinks}
            {step === cityStepIndex && StepCity}
            {step === referrerStepIndex && StepReferrer}
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


