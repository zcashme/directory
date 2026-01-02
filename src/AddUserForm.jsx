import ZcashAddressInput from "./components/ZcashAddressInput";
import { createPortal } from "react-dom";

import { validateZcashAddress } from "./utils/zcashAddressUtils";
import { cachedProfiles, resetCache } from "./hooks/useProfiles"; // if exported (we’ll adjust below)
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { AnimatePresence, motion } from "framer-motion";
import VerifiedBadge from "./components/VerifiedBadge";
import ProfileSearchDropdown from "./components/ProfileSearchDropdown";
import CitySearchDropdown from "./components/CitySearchDropdown"; // add with the imports if missing
import { useNavigate } from "react-router-dom";

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

import { isValidUrl } from "./utils/validateUrl";
import { buildSocialUrl } from "./utils/buildSocialUrl";
import SocialLinkInput from "./components/SocialLinkInput";


// Normalize for identity: spaces → underscores, case-insensitive
const normForConflict = (s = "") =>
  s
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "_") // treat spaces as underscores
    .toLowerCase();


// Slug-like (for display/helpers): replace spaces with underscores, keep user’s special chars
const toSlugish = (s = "") =>
  s
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "_");


const slide = {
  initial: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.22 } },
  exit: (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.18 } }),
};
export default function AddUserForm({ isOpen, onClose, onUserAdded }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameHelp, setNameHelp] = useState("");
  const [nameConflict, setNameConflict] = useState(null);
  const [address, setAddress] = useState("");
  const [addressHelp, setAddressHelp] = useState("");
  const [addressConflict, setAddressConflict] = useState(null);

  const [referrer, setReferrer] = useState("");

  const [nearestCity, setNearestCity] = useState(null);
  const [nearestCityInput, setNearestCityInput] = useState("");

  const [links, setLinks] = useState([{ platform: "X", username: "", otherUrl: "", valid: true }]);
  const [profiles, setProfiles] = useState([]);
  const [verifiedNameKeys, setVerifiedNameKeys] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  // Prefill referrer when Directory broadcasts an active profile
  useEffect(() => {
    const handler = (e) => {
      if (!e.detail) return;
      const { id, name } = e.detail;
      if (id && name) {
        setReferrer({ id, name });
        window.lastReferrer = { id, name };
      }
    };

    window.addEventListener("prefillReferrer", handler);
    return () => window.removeEventListener("prefillReferrer", handler);
  }, []);

  // --- Effect 1: Reset and load data ---

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setStep(0);
      setDir(1);
      setName("");
      setDisplayName("");
      setNameHelp("");
      setNameConflict(null);
      setAddress("");
      setAddressHelp("");
      // Default reset
      setReferrer("");

      // Auto-prefill from global event (last selected profile)
      const fromEvent = window.lastReferrer;
      if (fromEvent?.id && fromEvent?.name) {
        setReferrer({
          id: fromEvent.id,
          name: fromEvent.name,
        });
      }

      setLinks([{ platform: "X", username: "", otherUrl: "", valid: true }]);
      setError("");
      setIsLoading(false);

      const profilesData = cachedProfiles || [];
      setProfiles(profilesData);

      // Recompute verified-name keys using the same data source
      const verifiedIds = new Set(
        profilesData
          .filter((p) => p.address_verified)
          .map((p) => p.id)
      );

      const vNameKeys = new Set(
        profilesData
          .filter((p) => verifiedIds.has(p.id))
          .map((p) => normForConflict(p.name || ""))
      );

      setVerifiedNameKeys(vNameKeys);

      setTimeout(() => dialogRef.current?.querySelector("#name")?.focus(), 50);
    })();
  }, [isOpen]);

  // --- Effect 2: Validate name ---
  useEffect(() => {
    if (!name) return;

    const key = normForConflict(name);

    const matchingProfile = profiles.find(
      (p) => normForConflict(p.name) === key
    );

    if (matchingProfile) {
      const isVerified =
        verifiedNameKeys.has(normForConflict(matchingProfile.name));

      if (isVerified) {
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

    setNameHelp(`Shared as: Zcash.me/${toSlugish(name)}`);
  }, [name, profiles, verifiedNameKeys]);

  // --- Effect 3: Validate address (using full spec check) ---
  useEffect(() => {
    const addrNorm = address.trim().toLowerCase();
    const res = validateZcashAddress(addrNorm);

    if (!address) {
      setAddressHelp("Enter your Zcash address (t1…, zs1…, or u1…).");
      setAddressConflict(null);
      return;
    }

    // 🚫 Duplicate address check
    const duplicateAddr = profiles.some(
      (p) => (p.address || "").trim().toLowerCase() === addrNorm
    );
    if (duplicateAddr) {
      setAddressConflict({
        type: "error",
        text: "That Zcash address is already associated with an existing profile. Generate a new one — it’s free — and try again.",
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
        "That’s a TEX (transparent-source-only) address defined in ZIP 320. It can’t receive from shielded senders. Use a z- or u- address instead."
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
  }, [address, profiles]);

  // ✅ Guard AFTER all hooks, before rendering
  if (!isOpen) return null;


  // ---------- Links helpers ----------
  function updateLink(index, patch) {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addLinkField() {
    setLinks([...links, { platform: "X", username: "", otherUrl: "", valid: true }]);
  }

  function removeLinkField(index) {
    setLinks(links.filter((_, i) => i !== index));
  }

  // Build the final list of fully-formed links (only valid ones kept)
  const builtLinks = links
    .map((l) => {
      if (l.platform === "Other") {
        return l.otherUrl?.trim() || "";
      }
      return buildSocialUrl(l.platform, (l.username || "").trim()) || "";
    })
    .filter((url) => {
      if (!url) return false;
      const res = isValidUrl(url);
      return res.valid;
    });

  // ---------- Step Validation ----------
  const stepIsValid = (() => {
    switch (step) {
      case 0:
        // Allow proceeding if there's no conflict or only an informational (unverified) conflict
        return !!name.trim() && !!displayName.trim() && (!nameConflict || nameConflict.type !== "error");


      case 1: {
        const res = validateZcashAddress(address.trim());
        const duplicateAddr = profiles.some(
          (p) => (p.address || "").trim().toLowerCase() === address.trim().toLowerCase()
        );
        if (duplicateAddr) return false;
        if (res.type === "tex" || res.type === "transparent") return false;
        return !!address.trim() && res.valid;
      }


      case 2:
        return links.every((l) => l.valid !== false);
      case 3:
        return true; // nearest city optional
      case 4:
        return true; // referrer optional
      case 5: {
        const res = validateZcashAddress(address.trim());
        return (
          !!name.trim() &&
          !!address.trim() &&
          (!nameConflict || nameConflict.type !== "error") &&
          res.valid &&
          res.type !== "tex" &&
          res.type !== "transparent"
        );
      }



      default:
        return false;
    }
  })();


  // ---------- Submit ----------
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Ensure links are valid
    const invalid = links.some((l) => {
      if (l.platform === "Other") {
        return l.otherUrl && !isValidUrl(l.otherUrl.trim());
      } else {
        if (!l.username) return false; // empty row is okay
        const built = buildSocialUrl(l.platform, l.username.trim()) || "";
        const res = isValidUrl(built);
        return !(built && res.valid);
      }
    });
    if (invalid) {
      setError("One or more links are invalid. Please fix them before continuing.");
      return;
    }

    // 🔍 Check for duplicate verified name
    const proposedKey = normForConflict(name);
    const verifiedConflict = profiles.some(
      (p) =>
        verifiedNameKeys.has(normForConflict(p.name)) &&
        normForConflict(p.name) === proposedKey
    );
    if (verifiedConflict) {
      setError(
        'That name is already used by a verified profile. Spaces are treated as underscores and casing is ignored.'
      );
      return;
    }

    // 🚫 NEW: Check for duplicate Zcash address (case-insensitive)
    const addr = address.trim().toLowerCase();
    const duplicateAddr = profiles.find(
      (p) => p.address?.trim().toLowerCase() === addr
    );
    if (duplicateAddr) {
      setError("That address is already associated with an existing profile.");
      return;
    }

    // ✅ Continue if name/address are unique
    const finalLinks = links
      .map((l) => {
        if (l.platform === "Other") return l.otherUrl?.trim();
        if (!l.username) return "";
        return buildSocialUrl(l.platform, l.username.trim()) || "";
      })
      .filter((u) => {
        const res = isValidUrl(u);
        return u && res.valid;
      });

    // 🚫 Duplicate address guard (frontend)
    const addrNorm = address.trim().toLowerCase();
    const addrDuplicateLocal = profiles.some(
      (p) => (p.address || "").trim().toLowerCase() === addrNorm
    );
    if (addrDuplicateLocal) {
      setError("That Zcash address is already associated with an existing profile.");
      return;
    }

    // 🔒 Server-side check (in case local data is stale)
    const { data: addrMatch, error: addrErr } = await supabase
      .from("zcasher")
      .select("id")
      .or(`address.eq.${address.trim()},address.ilike.${address.trim()}`)
      .limit(1);

    if (!addrErr && addrMatch && addrMatch.length) {
      setError("That Zcash address is already associated with an existing profile.");
      return;
    }

    setIsLoading(true);

    try {
      // 1️⃣ Insert new profile
      const { data: profile, error: profileError } = await supabase
        .from("zcasher")
        .insert([
          {
            name: name.trim(),
            display_name: displayName.trim() || null,
            address: address.trim(),
            referred_by: referrer?.name || null,
            referred_by_zcasher_id: referrer?.id || null,

            nearest_city_id: nearestCity?.id || null,
            nearest_city_name: nearestCity?.city_ascii || nearestCity?.city || null,

            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (profileError) throw profileError;

      // 2️⃣ Insert profile links
      for (const url of finalLinks) {
        await supabase.from("zcasher_links").insert([
          {
            zcasher_id: profile.id,
            label: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
            url,
            is_verified: false,
          },
        ]);
      }




      // ✅ Generate a router-safe slug
      const slugBase = profile.name.trim().toLowerCase().replace(/\s+/g, "_");
      const slug = `${slugBase}-${profile.id}`; // use dash instead of hash


      // 🧹 Clear cached profiles so directory reloads fresh
      resetCache();

      // If you prefer not to reload, you could instead trigger the callback:
      onUserAdded?.(profile);
      onClose?.();

      // ✅ Redirect to /name-id (React Router friendly)
      window.location.assign(`/${slug}`);




    } catch (err) {
      console.error("Add name failed:", err);
      if (err?.message?.includes("duplicate key value")) {
        setError("That address or name already exists. Please choose a unique one.");
      } else {
        setError(err?.message || "Failed to add name.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ---------- Navigation ----------
  const goNext = () => {
    if (!stepIsValid) return;
    setDir(1);
    setStep((s) => Math.min(5, s + 1));
  };
  const goBack = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));

    // 🧹 Clear leftover conflict state when navigating back
    setAddressConflict(null);
  };

  // ---------- UI ----------
  const StepName = (
    <motion.div key="step-name" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">
        Username
      </label>
      <div className="flex items-center w-full rounded-2xl border border-black/30 overflow-hidden bg-transparent focus-within:border-blue-600">
        <span className="pl-3 pr-1 text-sm text-gray-500 select-none whitespace-nowrap">Zcash.me/</span>
        <input
          id="name"
          value={name}
          onChange={(e) => {
            const input = e.target.value;

            // Allow letters, numbers, underscores, and emojis — remove other punctuation/symbols
            const filtered = input
              .normalize("NFKC")
              .replace(/[^\p{L}\p{N}_\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/gu, "");

            setName(filtered);
          }}
          className="flex-1 px-1 py-2 text-sm outline-none bg-transparent"
          placeholder="username"
          autoComplete="off"
        />
      </div>
      <p
        className={`mt-1 text-xs ${nameConflict?.type === "error"
          ? "text-red-600"
          : nameConflict?.type === "info"
            ? "text-blue-600"
            : "text-gray-500"
          }`}
      >
        {nameConflict?.text
          ? nameConflict.text
          : nameHelp || "Use only letters, numbers, underscores, or emojis. Spaces become underscores."}
      </p>
      {addressConflict && (
        <p
          className={`mt-1 text-xs ${addressConflict?.type === "error"
            ? "text-red-600"
            : addressConflict?.type === "info"
              ? "text-blue-600"
              : "text-gray-600"
            }`}
        >
          {addressConflict?.text || ""}
        </p>
      )}

      {/* Display Name */}
      <label htmlFor="displayName" className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1 mt-4">
        Display Name
      </label>
      <input
        id="displayName"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="w-full rounded-2xl border border-black/30 px-3 py-2 text-sm outline-none focus:border-blue-600 bg-transparent"
        placeholder="Enter display name"
        autoComplete="off"
      />
      <p className="mt-1 text-xs text-gray-500">Shown on your profile instead of your username.</p>

    </motion.div>
  );



  const StepAddress = (
    <motion.div key="step-address" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <ZcashAddressInput value={address} onChange={setAddress} />
      {(addressConflict || addressHelp) && (
        <p
          className={`mt-1 text-xs ${addressConflict?.type === "error"
            ? "text-red-600"
            : addressConflict?.type === "info"
              ? "text-blue-600"
              : "text-gray-600"
            }`}
        >
          {typeof addressConflict === "object"
            ? addressConflict?.text
            : typeof addressConflict === "string"
              ? addressConflict
              : addressHelp}
        </p>
      )}


      <p className="mt-4 text-xs text-gray-500">
        <span className="font-bold text-gray-700">Did you know?</span> This Zcash address and its activity cannot be found on-chain.
      </p>
    </motion.div>
  );

  const StepCity = (
    <motion.div
      key="step-city"
      custom={dir}
      variants={slide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <label
        htmlFor="nearest-city"
        className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1"
      >
        Nearest City
      </label>

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

      <p className="mt-1 text-xs text-gray-500">
        Optional. Helps Zcashers find other Zcashers around them.
      </p>
    </motion.div>
  );

  const StepReferrer = (
    <motion.div key="step-ref" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <label htmlFor="referrer" className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">
        Referred by Zcash.me/
      </label>

      <div className="flex items-center w-full rounded-2xl border border-black/30 overflow-hidden bg-transparent focus-within:border-blue-600">
        <span className="pl-3 pr-1 text-sm text-gray-500 select-none whitespace-nowrap">Zcash.me/</span>
        <ProfileSearchDropdown
          value={referrer?.name || referrer || ""}
          onChange={(v) => setReferrer(v)}
          profiles={profiles}
          placeholder="username"
          showByDefault={false}
          className="flex-1 px-1 py-2 text-sm outline-none bg-transparent"
        />
      </div>


      <p className="mt-1 text-xs text-gray-500">Optional. Helps us reward members who refer new members.</p>
    </motion.div>
  );

  const StepLinks = (
    <motion.div key="step-links" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">Add social links to help others identify you</label>

      {links.map((link, index) => (
        <SocialLinkInput
          key={index}
          value={link}
          onChange={(nextValue) => updateLink(index, nextValue)}
          allowRemove={links.length > 1}
          onRemove={() => removeLinkField(index)}
        />
      ))}
      <button type="button" onClick={addLinkField} className="text-sm font-semibold text-blue-700 hover:underline mt-1">
        ＋ Add more links
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Tip: You can authenticate links from Edit Profile after verifying your Zcash address.
      </p>
    </motion.div>
  );

  const StepReview = (
    <motion.div key="step-review" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold text-gray-700">Username:</span>{" "}
          <span className="font-mono">{name || "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">Display Name:</span>{" "}
          <span className="font-mono">{displayName || "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">Zcash Address:</span>{" "}
          <span className="font-mono break-all">{address || "—"}</span>
        </div>

        <div>
          <span className="font-semibold text-gray-700">Nearest City:</span>{" "}
          <span>{nearestCity?.city_ascii || nearestCity?.city || "—"}</span>

        </div>
        <div>
          <span className="font-semibold text-gray-700">Referred by:</span>{" "}
          <span>{referrer?.name || "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">Links:</span>
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
      <p className="mt-3 text-xs text-gray-500">
        By submitting, you agree that these items will be listed publicly. You can add and remove items later.
      </p>
    </motion.div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center pt-[10vh] sm:pt-0 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-fadeIn"
      >
        {/* Header */}
        <div className="relative border-b border-black/10 overflow-hidden rounded-t-2xl">
          {/* Progress Bar Background */}
          <div
            className="absolute top-0 left-0 bottom-0 transition-all duration-700 ease-in-out opacity-80"
            style={{
              width: `${((step + 1) / 6) * 100}%`,
              backgroundImage: 'linear-gradient(90deg, #fde047, #4ade80, #60a5fa, #fde047)',
              backgroundSize: '200% 100%',
              animation: 'slideGradient 15s linear infinite'
            }}
          />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 leading-tight">Zcash is better with friends</h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mt-0.5">
                Step {step + 1} of 6
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // stop default submit
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
              <button
                type="button"
                onClick={goBack}
                className="w-full py-2.5 rounded-xl border border-black/30 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-black/30 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex-1">
            {step < 5 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!stepIsValid}
                title={!stepIsValid && nameConflict?.type === "error" ? "This name is already used by a verified profile." : ""}
                className={`w-full py-2.5 rounded-xl border text-sm font-semibold ${stepIsValid
                  ? "border-black/30 text-blue-700 hover:border-blue-600 hover:bg-blue-50"
                  : "border-black/20 text-gray-400 cursor-not-allowed opacity-60"
                  }`}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !stepIsValid}
                className="w-full py-2.5 rounded-xl border border-black/30 text-sm font-semibold text-blue-700 hover:border-blue-600 hover:bg-blue-50 disabled:opacity-60"
              >
                {isLoading ? "Adding..." : "Add Name"}
              </button>
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


