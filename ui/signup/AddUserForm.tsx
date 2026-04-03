"use client";

import ZcashAddressInput from "@/ui/signup/ZcashAddressInput";
import { createPortal } from "react-dom";

import type { Profile } from "@/lib/profile/types";
import type { City } from "@/lib/directory/searchCitiesAction";
import { validateZcashAddress } from "./zcashAddress";
import { useState, useEffect, useRef } from "react";
import type { SVGProps, FormEvent } from "react";
import {
  createProfileAction,
  insertProfileLinksAction,
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

import { isValidUrl } from "@/lib/profile/urlValidation";
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

interface AddUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: (_profile: Profile) => void;
  prefillUsername?: string | null;
  prefillReferrer?: string | null;
  isNsSignup?: boolean;
}

export default function AddUserForm({
  isOpen,
  onClose,
  onUserAdded,
  prefillUsername = null,
  prefillReferrer = null,
  isNsSignup = false,
}: AddUserFormProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const tapProps = getProfileCardTapMotionProps(shouldReduceMotion);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Referrer>;
      if (!customEvent.detail) return;
      const { id, name } = customEvent.detail;
      if (id && name) {
        setReferrer({ id, name });
        (window as any).lastReferrer = { id, name };
      }
    };

    window.addEventListener("prefillReferrer", handler as unknown as EventListener);
    return () => window.removeEventListener("prefillReferrer", handler as unknown as EventListener);
  }, []);


  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setStep(0);
      setDir(1);
      setName(prefillUsername || "");
      setDisplayName("");
      setNameHelp("");
      setNameConflict(null);
      setAddress("");
      setAddressHelp("");
      setAddressConflict(null);
      setReferrer(prefillReferrer || "");
      setReferrerConflict(null);

      const fromEvent = (window as any).lastReferrer;
      if (fromEvent?.id && fromEvent?.name) {
        setReferrer({
          id: fromEvent.id,
          name: fromEvent.name,
        });
      }

      setLinks([{ platform: "X", username: "", otherUrl: "", valid: true }]);
      setError("");
      setIsLoading(false);

      setTimeout(() => dialogRef.current?.querySelector<HTMLInputElement>("#name")?.focus(), 50);
    })();
  }, [isOpen, prefillReferrer, prefillUsername]);

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

  const builtLinks = links
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
    });

  const stepIsValid = (() => {
    switch (step) {
      case 0:
        return !!name.trim() && !!displayName.trim() && (!nameConflict || nameConflict.type !== "error");


      case 1: {
        const res = validateZcashAddress(address.trim());
        if (addressConflict?.type === "error") return false;
        if (res.type === "tex" || res.type === "transparent") return false;
        return !!address.trim() && res.valid;
      }


      case 2:
        return links.every((l) => l.valid !== false);
      case 3:
        return true;
      case 4:
        return true;
      case 5: {
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



      default:
        return false;
    }
  })();


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

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

    const finalLinkEntries = links
      .map((l) => {
        if (l.platform === "Other") {
          const url = l.otherUrl?.trim() || "";
          const res = isValidUrl(url);
          if (!url || !res.valid) return null;
          return {
            url,
            label: toPrettyDomain(url),
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

      const linksResult = await insertProfileLinksAction(profile.id, finalLinkEntries);
      if (!linksResult.ok) {
        // Continue anyway - profile is created
      }




      const slugBase = normalizeUsernameForSlug(profile.name);
      const slug = `${slugBase}-${profile.id}`;

      onUserAdded?.(profile);
      onClose?.();

      window.location.assign(`/${slug}`);




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
    setStep((s) => Math.min(5, s + 1));
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
        onChange={(e) => setDisplayName(e.target.value)}
        className={`w-full rounded-2xl border px-3 py-2 text-sm outline-hidden bg-transparent ${withFieldBorderState("border-black/30")}`}
        placeholder="Enter display name"
        autoComplete="off"
      />
      <p className="mt-1 text-xs text-gray-600">Shown on your profile instead of your username.</p>

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
          <span className="font-semibold text-gray-800">Referred by:</span>{" "}
          <span>{typeof referrer === "object" ? referrer?.name || "—" : "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-800">Links:</span>
          {builtLinks.length ? (
            <ul className="mt-1 list-disc list-inside space-y-1">
              {builtLinks.map((u, i) => (
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
          if (e.target === e.currentTarget) onClose();
        }}
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        className={`relative w-full max-w-md animate-fadeIn ${PROFILE_CARD_MODAL_CHROME_CLASSES}`}
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-[26px] border-b border-black/10">
          {/* Progress Bar Background */}
          <div
            className="absolute top-0 left-0 bottom-0 transition-all duration-700 ease-in-out opacity-80"
            style={{
              width: `${((step + 1) / 6) * 100}%`,
              backgroundImage: 'linear-gradient(90deg, #fde047, #4ade80, #22c55e, #fde047)',
              backgroundSize: '200% 100%',
              animation: 'slideGradient 15s linear infinite'
            }}
          />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">Zcash is better with friends</h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-800 mt-0.5">
                Step {step + 1} of 6
              </p>
            </div>
            <motion.button
              type="button"
              onClick={onClose}
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
              if (step < 5 && stepIsValid) {
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
            {step === 1 && StepAddress}
            {step === 2 && StepLinks}
            {step === 3 && StepCity}
            {step === 4 && StepReferrer}
            {step === 5 && StepReview}
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
                onClick={onClose}
                {...tapProps}
                className={"w-full " + PROFILE_CARD_SECONDARY_ACTION_BUTTON_CLASSES}
              >
                Cancel
              </motion.button>
            )}
          </div>

          <div className="flex-1">
            {step < 5 ? (
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


