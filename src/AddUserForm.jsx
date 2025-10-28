import ZcashAddressInput from "./components/ZcashAddressInput";
import { validateZcashAddress } from "./utils/zcashAddressUtils";

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { AnimatePresence, motion } from "framer-motion";

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Simple URL validation
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}


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

const PLATFORMS = [
  { key: "X", label: "X (Twitter)", base: "https://x.com/" },
  { key: "GitHub", label: "GitHub", base: "https://github.com/" },
  { key: "Instagram", label: "Instagram", base: "https://instagram.com/" },
  { key: "Reddit", label: "Reddit", base: "https://reddit.com/user/" },
  { key: "LinkedIn", label: "LinkedIn", base: "https://linkedin.com/in/" },
  { key: "Discord", label: "Discord Invite", base: "https://discord.gg/" },
  { key: "TikTok", label: "TikTok", base: "https://tiktok.com/@" },
  { key: "Bluesky", label: "Bluesky", base: "https://bsky.app/profile/" },
  { key: "Mastodon", label: "Mastodon", base: "https://mastodon.social/@" },
  { key: "Snapchat", label: "Snapchat", base: "https://snapchat.com/add/" },
  { key: "Other", label: "Other (custom URL)", base: "" },
];

const slide = {
  initial: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.22 } },
  exit: (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.18 } }),
};
export default function AddUserForm({ isOpen, onClose, onUserAdded }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [nameHelp, setNameHelp] = useState("");
  const [nameConflict, setNameConflict] = useState(null);
  const [address, setAddress] = useState("");
  const [addressHelp, setAddressHelp] = useState("");
  const [addressConflict, setAddressConflict] = useState(null);

  const [referrer, setReferrer] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [links, setLinks] = useState([{ platform: "X", username: "", otherUrl: "", valid: true }]);
  const [profiles, setProfiles] = useState([]);
  const [verifiedNameKeys, setVerifiedNameKeys] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  
  // --- Effect 1: Reset and load data ---
  
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setStep(0);
      setDir(1);
      setName("");
      setNameHelp("");
      setNameConflict(null);
      setAddress("");
      setAddressHelp("");
      setReferrer("");
      setLinks([{ platform: "X", username: "", otherUrl: "", valid: true }]);
      setError("");
      setIsLoading(false);

      const [{ data: zrows }, { data: linkRows }, { data: itemRows }] = await Promise.all([
        supabase
          .from("zcasher")
          .select("id, name, address, address_verified, zcasher_links(is_verified)")
          .order("name", { ascending: true }),
        supabase.from("zcasher_links").select("zcasher_id, is_verified").eq("is_verified", true),
        supabase
          .from("zcasher_items")
          .select("zcasher_id, is_verified, kind")
          .eq("is_verified", true)
          .eq("kind", "address"),
      ]);

      const profilesData = Array.isArray(zrows) ? zrows : [];
      setProfiles(profilesData);

      const verifiedIds = new Set(
        [
          ...profilesData.filter((p) => p.address_verified).map((p) => p.id),
          ...((linkRows || []).filter((r) => r.is_verified).map((r) => r.zcasher_id)),
          ...((itemRows || []).filter((r) => r.is_verified).map((r) => r.zcasher_id)),
        ].filter(Boolean)
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
      text: "That name is used by an unverified profile. You can still proceed and verify later to secure this short link.",
    });
  }
} else {
  setNameConflict(null);
}

  setNameHelp(`Displayed as: ${toSlugish(name)}`);
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
      const cur = { ...next[index], ...patch };
      // Sanitize username: block http(s) in username field
      if (cur.username && /https?:\/\//i.test(cur.username)) {
        cur.username = cur.username.replace(/https?:\/\/+/gi, "");
        cur.valid = false;
      }

      // Validate: if Other → validate otherUrl as full URL; else require username, ensure final URL is valid-looking
      if (cur.platform === "Other") {
        cur.valid = cur.otherUrl ? isValidUrl(cur.otherUrl.trim()) : true; // empty allowed
      } else {
        const base = PLATFORMS.find((p) => p.key === cur.platform)?.base || "";
        const built = base + (cur.username || "");
        // if username present, ensure built URL is valid (add check that base is present)
        cur.valid =
          !cur.username || // empty username allowed → treated as skip
          (base.length > 0 && isValidUrl(built));
      }

      next[index] = cur;
      return next;
    });
  }

  function addLinkField() {
    setLinks([...links, { platform: "X", username: "", otherUrl: "", valid: true }]);
  }

  function removeLinkField(index) {
    setLinks(links.filter((_, i) => i !== index));
  }

  const builtLinks = links
    .map((l) => {
      if (l.platform === "Other") {
        return l.otherUrl?.trim() || "";
      }
      const base = PLATFORMS.find((p) => p.key === l.platform)?.base || "";
      return l.username ? `${base}${l.username.trim()}` : "";
    })
    .filter(Boolean);
  // ---------- Step Validation ----------
  const stepIsValid = (() => {
    switch (step) {
      case 0:
        // Allow proceeding if there's no conflict or only an informational (unverified) conflict
        return !!name.trim() && (!nameConflict || nameConflict.type !== "error");


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
        return true; // referrer optional

      case 3:
        // All link rows must be valid if filled; at least zero links allowed
        return links.every((l) => l.valid !== false);

      case 4: {
        const res = validateZcashAddress(address.trim());
        return (
          !!name.trim() &&
          !!address.trim() &&
          !nameConflict &&
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
      const base = PLATFORMS.find((p) => p.key === l.platform)?.base || "";
      return !(base && isValidUrl(base + l.username.trim()));
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
    const base = PLATFORMS.find((p) => p.key === l.platform)?.base || "";
    return base + l.username.trim();
  })
  .filter((u) => u && isValidUrl(u));

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
          address: address.trim(),
          referred_by: referrer || null,
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

    // 3️⃣ Redirect user to their new profile
    onUserAdded?.(profile);

    // Give Supabase a moment to sync before navigation
    setTimeout(() => {
      window.location.href = `/${profile.name.trim().toLowerCase().replace(/\s+/g, "_")}`;
    }, 150);

    onClose?.();

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
    setStep((s) => Math.min(4, s + 1));
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
        Name
      </label>
      <input
        id="name"
        value={name}
        onChange={(e) => {
  const input = e.target.value;

  // Allow letters, numbers, underscores, and emojis — remove other punctuation/symbols
  const filtered = input
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_\p{Emoji_Presentation}\p{Extended_Pictographic}]+/gu, "");

  setName(filtered);
}}
        className="w-full rounded-2xl border border-black/30 px-3 py-2 text-sm outline-none focus:border-blue-600 bg-transparent"
        placeholder="Enter name"
        autoComplete="off"
      />
<p
  className={`mt-1 text-xs ${
    nameConflict?.type === "error"
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
    className={`mt-1 text-xs ${
      addressConflict?.type === "error"
        ? "text-red-600"
        : addressConflict?.type === "info"
        ? "text-blue-600"
        : "text-gray-600"
    }`}
  >
    {addressConflict?.text || ""}
  </p>
)}


    </motion.div>
  );


// then later inside the StepAddress definition
const StepAddress = (
  <motion.div key="step-address" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
    <ZcashAddressInput value={address} onChange={setAddress} />
{(addressConflict || addressHelp) && (
  <p
    className={`mt-1 text-xs ${
      addressConflict?.type === "error"
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


  </motion.div>
);


  const StepReferrer = (
    <motion.div key="step-ref" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <label htmlFor="referrer" className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">
        Referred by Zcash.me/
      </label>

      <div className="relative">
        <input
          id="referrer"
          type="text"
          value={referrer}
          onChange={(e) => {
            setReferrer(e.target.value);
            setShowDropdown(true);
          }}
          placeholder="Type to search (optional)…"
          className="w-full rounded-2xl border border-black/30 px-3 py-2 text-sm outline-none focus:border-blue-600 bg-transparent"
          autoComplete="off"
        />

        {showDropdown && referrer && (
          <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-black/30 bg-white shadow-lg">
            {profiles
              .filter((p) => p.name.toLowerCase().includes(referrer.toLowerCase()))
              .slice(0, 20)
              .map((p) => (
                <div
                  key={p.name}
                  onClick={() => {
                    setReferrer(p.name);
                    setShowDropdown(false);
                  }}
                  className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center gap-1"
                >
                  {p.name}
                  {(p.address_verified || p.zcasher_links?.some((l) => l.is_verified)) && (
                    <span title="Verified" className="text-green-600">
                      ✔
                    </span>
                  )}
                </div>
              ))}
            {!profiles.some((p) => p.name.toLowerCase().includes(referrer.toLowerCase())) && (
              <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
            )}
          </div>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-500">Optional. Helps us rank referrals.</p>
    </motion.div>
  );

  const StepLinks = (
    <motion.div key="step-links" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">Profile links</label>

      {links.map((link, index) => {
        const platform = PLATFORMS.find((p) => p.key === link.platform) || PLATFORMS[0];
        const preview =
          link.platform === "Other"
            ? (link.otherUrl || "").trim()
            : platform.base + (link.username || "");

        return (
          <div key={index} className="mb-3 rounded-xl border border-black/20 p-3 bg-white/60">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={link.platform}
                onChange={(e) => updateLink(index, { platform: e.target.value })}
                className="rounded-xl border border-black/30 px-3 py-2 text-sm bg-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>

              {link.platform === "Other" ? (
                <input
                  type="text"
                  value={link.otherUrl}
                  onChange={(e) => updateLink(index, { otherUrl: e.target.value })}
                  placeholder="https://example.com/your-page"
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-mono bg-transparent outline-none ${
                    link.valid ? "border-black/30 focus:border-blue-600" : "border-red-400 focus:border-red-500"
                  }`}
                />
              ) : (
                <div className="flex-1 flex items-center">
                  <span className="px-3 py-2 rounded-l-xl border border-r-0 border-black/30 bg-gray-50 text-xs font-mono text-gray-600 select-none">
                    {platform.base}
                  </span>
                  <input
                    type="text"
                    value={link.username}
                    onChange={(e) => updateLink(index, { username: e.target.value })}
                    placeholder="your_username"
                    className={`flex-1 rounded-r-xl border px-3 py-2 text-sm font-mono bg-transparent outline-none ${
                      link.valid ? "border-black/30 focus:border-blue-600" : "border-red-400 focus:border-red-500"
                    }`}
                  />
                </div>
              )}

              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLinkField(index)}
                  className="text-red-600 hover:text-red-700 text-sm font-semibold self-center"
                  title="Remove link"
                >
                  ⛌
                </button>
              )}
            </div>

            {preview && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-semibold">Preview:</span>{" "}
                <span className="font-mono break-all">{preview}</span>
              </div>
            )}

            {!link.valid && (
              <p className="text-xs text-red-600 mt-1 ml-1">
                {link.platform === "Other"
                  ? "Enter a full URL starting with http:// or https://"
                  : "Do not include http:// or https:// in the username field."}
              </p>
            )}
          </div>
        );
      })}

      <button type="button" onClick={addLinkField} className="text-sm font-semibold text-blue-700 hover:underline mt-1">
        ＋ Add another link
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Tip: You can verify your links when you edit your profile. 
      </p>
    </motion.div>
  );

  const StepReview = (
    <motion.div key="step-review" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit">
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-semibold text-gray-700">Name:</span>{" "}
          <span className="font-mono">{name || "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">Zcash Address:</span>{" "}
          <span className="font-mono break-all">{address || "—"}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-700">Referred by:</span>{" "}
          <span>{referrer || "—"}</span>
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

  return (
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-lg font-semibold text-gray-800">Zcash is better with friends</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <form
  onSubmit={handleSubmit}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // stop default submit
      if (step < 4 && stepIsValid) {
        goNext(); // go to next slide instead
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
            {step === 2 && StepReferrer}
            {step === 3 && StepLinks}
            {step === 4 && StepReview}
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
            {step < 4 ? (
              <button
  type="button"
  onClick={goNext}
  disabled={!stepIsValid}
  title={!stepIsValid && nameConflict?.type === "error" ? "This name is already used by a verified profile." : ""}
  className={`w-full py-2.5 rounded-xl border text-sm font-semibold ${
    stepIsValid
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
        .animate-fadeIn { animation: fadeIn .25s ease-out; }
      `}</style>
    </div>
  );
}
