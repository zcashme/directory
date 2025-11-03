import { useState, useRef, useEffect } from "react";
import isNewProfile from "../utils/isNewProfile";
import CopyButton from "./CopyButton";
import { useFeedback } from "../store";
import VerifiedBadge from "./VerifiedBadge";
import VerifiedCardWrapper from "./VerifiedCardWrapper";
import ReferRankBadge from "./ReferRankBadge";
import ReferRankBadgeMulti from "./ReferRankBadgeMulti";
import ProfileEditor from "./ProfileEditor";
import HelpIcon from "./HelpIcon";
import CheckIcon from "../assets/CheckIcon";
import shareIcon from "../assets/share.svg";

import { motion, AnimatePresence  } from "framer-motion";
import React from "react";

function AddressCopyChip({ address }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex items-center gap-2 border text-gray-700 font-mono text-sm rounded-full px-3 py-1.5 shadow-sm w-fit max-w-[90%] transition-colors duration-300 ${
        copied ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50"
      }`}
    >
      <span
        className="truncate max-w-[180px] select-all"
        title={address}
      >
        {address}
      </span>

      <button
        onClick={handleCopy}
        className={`flex items-center justify-center transition-all ${
          copied
            ? "text-green-600 hover:text-green-600"
            : "text-gray-500 hover:text-blue-600"
        }`}
        title={copied ? "Copied!" : "Copy address"}
      >
        {copied ? (
  <CheckIcon className="h-4 w-4 text-green-600 drop-shadow-sm" />
) : (
  "⧉"
)}

      </button>
    </div>
  );
}


function EditableField({ label, value, fieldKey, multiline }) {
  const { setPendingEdit } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <motion.div layout className="mb-3">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-gray-700">{label}</label>
        <button
          onClick={() => {
            if (editing) setPendingEdit(fieldKey, draft);
            setEditing(!editing);
          }}
          className="text-xs text-blue-600 hover:underline"
        >
          {editing ? "Save" : "✎ Edit"}
        </button>
      </div>

      {editing ? (
        multiline ? (
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full resize-none bg-transparent cursor-default text-gray-700"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm font-mono"
          />
        )
      ) : (
        <p className="mt-1 text-gray-600 break-all">
          {value || <span className="italic text-gray-400">empty</span>}
        </p>
      )}
    </motion.div>
  );
}

function EditableLinks({ links }) {
  const { setPendingEdit } = useFeedback();
  const [linkList, setLinkList] = useState(
    links.length > 0 ? links.map((l) => ({ id: l.id || null, url: l.url })) : []
  );

  const handleChange = (index, value) => {
    const updated = [...linkList];
    updated[index].url = value;
    setLinkList(updated);
    setPendingEdit(
      "links",
      updated.map((l) => l.url)
    );
  };

  const addLink = () => {
    const updated = [...linkList, { id: null, url: "" }];
    setLinkList(updated);
  };

  const removeLink = (index) => {
    const updated = linkList.filter((_, i) => i !== index);
    setLinkList(updated);
    setPendingEdit(
      "links",
      updated.map((l) => l.url)
    );
  };

  return (
    <motion.div layout className="mt-4">
      <label className="font-semibold text-gray-700 block mb-2">Links</label>
      {linkList.map((link, index) => (
        <motion.div
          layout
          key={index}
          className="flex items-center gap-2 mb-2"
          transition={{ layout: { duration: 0.3 } }}
        >
          <input
            type="text"
            value={link.url}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder="https://example.com"
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono border-gray-300 focus:border-blue-500"
          />
          {link.id ? (
            <span className="text-gray-400 text-xs">saved</span>
          ) : (
            <button
              onClick={() => removeLink(index)}
              className="text-xs text-red-600 hover:underline"
            >
              ␡ Remove Link
            </button>
          )}
        </motion.div>
      ))}
      <button
        onClick={addLink}
        className="text-sm font-semibold text-blue-700 hover:underline mt-1"
      >
        ＋ Add Link
      </button>
    </motion.div>
  );
}


function LinkEditor() {
  const { setPendingEdit, pendingEdits } = useFeedback();
  const [newLinks, setNewLinks] = useState([]);

  const handleLinkChange = (index, value) => {
    const updated = [...newLinks];
    updated[index].url = value;
    updated[index].valid = !value || /^https?:\/\//.test(value);
    setNewLinks(updated);
    const validLinks = updated.filter((l) => l.valid && l.url);
    setPendingEdit(
      "new_links",
      validLinks.map((l) => l.url)
    );
  };

  const addLink = () => setNewLinks([...newLinks, { url: "", valid: true }]);
  const removeLink = (i) =>
    setNewLinks(newLinks.filter((_, idx) => idx !== i));

  return (
    <div>
      {newLinks.map((link, index) => (
        <div key={index} className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={link.url}
            onChange={(e) => handleLinkChange(index, e.target.value)}
            placeholder="https://example.com"
            className={`flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono ${
              link.valid
                ? "border-gray-300 focus:border-blue-500"
                : "border-red-400 focus:border-red-500"
            }`}
          />
          <button
            onClick={() => removeLink(index)}
            className="text-xs text-red-600 hover:underline"
          >
            ✖ Remove
          </button>
        </div>
      ))}
      <button
        onClick={addLink}
        className="text-sm font-semibold text-blue-700 hover:underline mt-1"
      >
        ＋ Add Link
      </button>
    </div>
  );
}


// Caching and CDN settings
const CDN_PROXY_URL = import.meta.env.VITE_CDN_PROXY_URL || "";
const memoryCache = new Map();

export default function ProfileCard({ profile, onSelect, warning, fullView = false }) {
  const [showLinks, setShowLinks] = useState(false);
  const [copied, setCopied] = React.useState(false);

  // 🔗 Lazy-load links from Supabase when needed
// (linksArray state/effect is defined later; duplicate removed)

  const [showStats, setShowStats] = useState(false);
  const hasAwards =
  (profile?.rank_alltime ?? 0) > 0 ||
  (profile?.rank_weekly ?? 0) > 0 ||
  (profile?.rank_monthly ?? 0) > 0 ||
  (profile?.rank_daily ?? 0) > 0;

  const [qrShown, setQRShown] = useState(false);
  const [linksShown, setLinksShown] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
// image cache and lazy load setup
const imgRef = useRef(null);
const [visible, setVisible] = useState(false);

const rawUrl = profile.profile_image_url || "";
const versionSuffix = profile.last_signed_at
  ? `?v=${encodeURIComponent(profile.last_signed_at)}`
  : profile.created_at
  ? `?v=${encodeURIComponent(profile.created_at)}`
  : "";
const finalUrl = rawUrl + versionSuffix;


useEffect(() => {
const handleEnterSignIn = (e) => {
  setShowBack(true);

  // Forward the event payload when triggered from other sources
  if (!e?.detail && profile) {
// ✅ Guard: only dispatch if profile data is ready
if (!profile?.id || !profile?.address) {
  console.warn("ProfileCard: profile not ready, skipping verify dispatch");
} else {
  window.dispatchEvent(
    new CustomEvent("enterSignInMode", {
      detail: {
        zId: profile.id,
        address: profile.address || "",
        name: profile.name || "",
        verified: !!profile.address_verified,
        since: (profile.joined_at || profile.created_at || profile.since || null),
      },
    })
  );

  // ✅ Cache last known payload in case event fires before listener is attached
  window.lastZcashFlipDetail = {
    zId: profile.id,
    address: profile.address || "",
    name: profile.name || "",
    verified: !!profile.address_verified,
    since: (profile.joined_at || profile.created_at || profile.since || null),
  };
}

    window.lastZcashFlipDetail = {
  zId: profile.id,
  address: profile.address || "",
  name: profile.name || "",
  verified: !!profile.address_verified,
  since: profile.since || null,
};

  }
};

  const handleEnterDraft = () => {
    setShowBack(false);
  };

  window.addEventListener("enterSignInMode", handleEnterSignIn);
  window.addEventListener("enterDraftMode", handleEnterDraft);
  return () => {
    window.removeEventListener("enterSignInMode", handleEnterSignIn);
    window.removeEventListener("enterDraftMode", handleEnterDraft);
  };
}, []);
// 🔹 Animate label expansion on mount (desktop only)
useEffect(() => {
  if (window.matchMedia("(hover: none)").matches) return; // skip on mobile
  const labels = document.querySelectorAll(".group span");
  labels.forEach((el) => {
    el.classList.add("max-w-[50px]", "opacity-100");
    setTimeout(() => {
      el.classList.remove("max-w-[50px]", "opacity-100");
    }, 2000);
  });
}, []);

useEffect(() => {
  // Always make visible for fullView or if already cached
  if (fullView || memoryCache.has(finalUrl)) {
    setVisible(true);
    return;
  }

  // Ensure we have a ref
  const el = imgRef.current;
  if (!el || !finalUrl) {
    setVisible(true); // fallback: always show
    return;
  }

  // Fallback if browser doesn't support IntersectionObserver
  if (typeof IntersectionObserver === "undefined") {
    setVisible(true);
    return;
  }

  // Lazy-load observer
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          memoryCache.set(finalUrl, true);
          obs.disconnect();
        }
      });
    },
    { rootMargin: "200px", threshold: 0.05 } // preload earlier
  );

  obs.observe(el);

  return () => obs.disconnect();
}, [finalUrl, fullView]);



  const { setSelectedAddress, setForceShowQR } = useFeedback();

  // Derive trust states (consistent with verified badge logic)
const verifiedAddress = !!profile.address_verified || !!profile.verified;

const verifiedLinks =
  (typeof profile.verified_links === "number"
    ? profile.verified_links
    : (typeof profile.verified_links_count === "number"
        ? profile.verified_links_count
        : null)) ??
  (profile.links?.filter((l) => l.is_verified).length || 0);

const hasVerifiedContent = verifiedAddress || verifiedLinks > 0;
const isVerified = hasVerifiedContent;

const expired =
  profile.last_verified_at &&
  new Date(profile.last_verified_at).getTime() <
    Date.now() - 1000 * 60 * 60 * 24 * 90; // expired if older than 90 days

  // 🔗 start with whatever might already be in profile.links or profile.links_json
const [linksArray, setLinksArray] = useState(() => {
  if (Array.isArray(profile.links)) return profile.links;
  if (typeof profile.links_json === "string") {
    try { return JSON.parse(profile.links_json); } catch { return []; }
  }
  if (Array.isArray(profile.links_json)) return profile.links_json;
  return [];
});

// 🔄 whenever "Show Links" is opened, fetch live links from Supabase
useEffect(() => {
  if (!profile?.id) return;

  import("../supabase").then(async ({ supabase }) => {
    const { data, error } = await supabase
      .from("zcasher_links")
      .select("id,label,url,is_verified")
      .eq("zcasher_id", profile.id)
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ Error fetching links:", error);
      return;
    }
    if (Array.isArray(data)) setLinksArray(data);
  });
}, [showLinks, profile?.id]);
const totalLinks = profile.total_links ?? (Array.isArray(linksArray) ? linksArray.length : 0);


const hasUnverifiedLinks =
  (profile.total_links ?? linksArray.length ?? 0) > 0 &&
  verifiedLinks === 0;


  const totalVerifications = (verifiedAddress ? 1 : 0) + verifiedLinks;

  const hasReferrals = (profile.referral_count ?? 0) > 0;
const isRanked =
  (profile.rank_alltime > 0 && profile.rank_alltime <= 10) ||
  (profile.rank_weekly > 0 && profile.rank_weekly <= 10) ||
  (profile.rank_monthly > 0 && profile.rank_monthly <= 10) ||
  (profile.rank_daily > 0 && profile.rank_daily <= 10) ||
  (profile.refRank ?? profile.referral_rank) <= 10;


let rankType = null;
if (profile.rank_alltime > 0 && profile.rank_alltime <= 10) rankType = "alltime";
else if (profile.rank_weekly > 0 && profile.rank_weekly <= 10) rankType = "weekly";
else if (profile.rank_monthly > 0 && profile.rank_monthly <= 10) rankType = "monthly";
else if (profile.rank_daily > 0 && profile.rank_daily <= 10) rankType = "daily";

  // ordinal helper for rank
  const ordinal = (n) => {
    if (!n || typeof n !== "number") return "";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

let circleClass = "bg-blue-500"; // default = All

if (isVerified && isRanked) {
  // Verified + ranked (any period)
  circleClass = "bg-gradient-to-r from-green-400  to-orange-500";
} else if (isVerified) {
  // Verified only
  circleClass = "bg-green-500";
} else if (rankType) {
  // Unverified + ranked (any period) → base blue blended with red/orange
  if (rankType === "alltime") {
    circleClass = "bg-gradient-to-r from-blue-500  to-red-500";
  } else if (rankType === "weekly") {
    circleClass = "bg-gradient-to-r from-blue-500  to-orange-500";
  } else if (rankType === "monthly") {
    circleClass = "bg-gradient-to-r from-blue-500  to-red-500";
  } else if (rankType === "daily") {
    circleClass = "bg-gradient-to-r from-blue-500  to-cyan-500";
  }
} else {
  // Default unverified + unranked
  circleClass = "bg-blue-500";
}



  const CheckIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block w-3.5 h-3.5 text-green-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );

  if (!fullView) {
    // Compact card (unchanged)
    return (
      <VerifiedCardWrapper
        verifiedCount={profile.verified_links_count ?? 0}
        featured={profile.featured}
        onClick={() => {
          onSelect(profile.address);
          requestAnimationFrame(() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          );
        }}
        className="rounded-2xl p-3 border transition-all cursor-pointer shadow-sm backdrop-blur-sm border-gray-500 bg-transparent hover:bg-gray-100/10 hover:shadow-[0_0_4px_rgba(0,0,0,0.05)] mb-2"
      >
        <div className="flex items-center gap-4 w-full">
          <div
            className={`relative flex-shrink-0 rounded-full overflow-hidden shadow-sm ${circleClass}`}
            style={{
              width: fullView ? "80px" : "45px",
              height: fullView ? "80px" : "45px",
              aspectRatio: "1 / 1",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 w-full h-full text-blue-700 opacity-20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            />
{/* Optimized lazy-loading profile image */}
{profile.profile_image_url && (
  <img
    ref={imgRef}
    src={finalUrl}
    alt={`${profile.name}'s profile`}
    className="absolute inset-0 w-full h-full object-contain"
    draggable="false"
    loading="lazy"
    decoding="async"
    referrerPolicy="no-referrer"
  />
)}


          </div>

          <div className="flex flex-col flex-grow overflow-hidden min-w-0">
<span className="font-semibold text-blue-700 leading-tight truncate flex items-center gap-2">
  {profile.name}
  {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
    <VerifiedBadge
      verified={true}
      verifiedCount={
        (profile.verified_links_count ?? 0) +
        (profile.address_verified ? 1 : 0)
      }
    />
  )}
  {isNewProfile(profile) && (
    <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-sm">
      NEW
    </span>
  )}
</span>

<div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-snug mt-0.5">
  <span>
    Joined{" "}
    {new Date(profile.joined_at || profile.created_at || profile.since).toLocaleString("default", {
      month: "short",
      year: "numeric",
    })}
  </span>

  {/* Show dot only if there are any referral badges */}
  {((profile.rank_alltime ?? 0) > 0 ||
    (profile.rank_weekly ?? 0) > 0 ||
    (profile.rank_monthly ?? 0) > 0 ||
    (profile.rank_daily ?? 0) > 0) && (
    <span className="text-gray-400">•</span>
  )}

  {(profile.rank_alltime ?? 0) > 0 && (
    <ReferRankBadgeMulti rank={profile.rank_alltime} period="all" />
  )}
  {(profile.rank_weekly ?? 0) > 0 && (
    <ReferRankBadgeMulti rank={profile.rank_weekly} period="weekly" />
  )}
  {(profile.rank_monthly ?? 0) > 0 && (
    <ReferRankBadgeMulti rank={profile.rank_monthly} period="monthly" />
  )}
  {(profile.rank_daily ?? 0) > 0 && (
    <ReferRankBadgeMulti rank={profile.rank_daily} period="daily" />
  )}
</div>
          </div>
        </div>
      </VerifiedCardWrapper>
    );
  }

  // Full card
  return (
    <VerifiedCardWrapper
      verifiedCount={
        (profile.verified_links_count ?? 0) +
        (profile.address_verified ? 1 : 0)
      }
    featured={profile.featured}
    className="relative mx-auto mt-3 mb-8 p-6 animate-fadeIn text-center max-w-lg"
    data-active-profile
    data-address={profile.address}
  >
<div
  className={`relative transition-transform duration-500 transform-style-preserve-3d ${
    showBack ? "rotate-y-180" : ""
  }`}
  style={{
    position: "relative",
    height: "auto",
    transformOrigin: "top center",
  }}
>

        {/* FRONT SIDE */}
<div
  className={`${showBack ? "absolute inset-0" : "relative h-auto"} backface-hidden top-0 left-0 w-full`}
>
{/* Top buttons row (menu + share) */}
<div className={`absolute top-4 left-4 right-4 z-10 flex items-center justify-between transition-transform duration-500 transform-style-preserve-3d ${showBack ? "rotate-y-180 opacity-0 pointer-events-none" : "rotate-y-0 backface-hidden"}`}>
  {/* Menu button */}
  <div className="relative">
    <button
      onClick={(e) => {
        e.stopPropagation();
        setMenuOpen((prev) => !prev);
      }}
      className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
      title="More options"
    >
      ☰
    </button>

    {/* Dropdown Menu */}
    {menuOpen && (
      <div className="absolute left-0 mt-2 w-36 rounded-xl border border-gray-300 bg-white shadow-lg overflow-hidden z-50 text-sm text-gray-700">
  {/* Determine if profile has any awards */}


{!showStats ? (
  <button
    onClick={() => {
      if (!hasAwards) return; // ignore click if no awards
      setShowStats(true);
      setMenuOpen(false);
    }}
    disabled={!hasAwards}
    className={`w-full text-left px-4 py-2 transition-colors ${
      hasAwards
        ? "hover:bg-blue-50 text-gray-800"
        : "text-gray-400 cursor-not-allowed opacity-60"
    }`}
  >
    ⭔ Show Awards
  </button>
) : (
  <button
    onClick={() => {
      setShowStats(false);
      setMenuOpen(false);
    }}
    className="w-full text-left px-4 py-2 hover:bg-blue-50"
  >
     ⭓ Hide Awards
  </button>
)}


        <button
          onClick={() => {
            setShowBack(true);
            setMenuOpen(false);
            console.log("🪪 Dispatching enterSignInMode with:", profile.id, profile.address);

            window.dispatchEvent(
              new CustomEvent("enterSignInMode", {
                detail: {
                  zId: profile.id,
                  address: profile.address || "",
                  name: profile.name || "",
                  verified: !!profile.address_verified,
                  since: profile.since || null,
                },
              })
            );
          }}
          className="w-full text-left px-4 py-2 hover:bg-blue-50"
        >
          ⮊ Edit Profile
        </button>
      </div>
    )}
  </div>

  {/* Share button (top-right) */}
  <button
    onClick={() => {
      const baseSlug = profile.name
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      const shareUrl = `${window.location.origin}/${profile.address_verified
        ? baseSlug
        : `${baseSlug}-${profile.id}`}`;

      if (navigator.share) {
        navigator
          .share({
            title: `${profile.name} on Zcash.me`,
            text: "Check out this Zcash profile:",
            url: shareUrl,
          })
          .catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl);
        alert("Profile link copied to clipboard!");
      }
    }}
    className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
    title={`Share ${profile.name}`}
  >
<img
  src={shareIcon}
  alt="Share"
  className="w-4 h-4 opacity-80 hover:opacity-100 transition-opacity"
/>
  </button>
</div>


      

          {/* Avatar */}
          <div
            className={`relative mx-auto w-20 h-20 rounded-full flex items-center justify-center shadow-sm overflow-hidden ${circleClass}`}
          >
{/* Optimized lazy-loading profile image */}
{visible && profile.profile_image_url ? (
  <img
    ref={imgRef}
    src={finalUrl}
    alt={`${profile.name}'s profile`}
    className="absolute inset-0 w-full h-full object-contain"
    draggable="false"
    loading="lazy"
    decoding="async"
    referrerPolicy="no-referrer"
  />
) : (

              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-blue-700 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              />
            )}
          </div>

{/* Awards section (animated, appears when Show Awards is active) */}
<AnimatePresence>
  {showStats && (
    <motion.div
      key="awards"
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 20,
        mass: 0.8,
      }}
      className="flex flex-wrap justify-center gap-2 mt-3 mb-1"
    >
      {(profile.rank_alltime ?? 0) > 0 && (
        <ReferRankBadgeMulti
          rank={profile.rank_alltime}
          period="all"
          alwaysOpen
        />
      )}
      {(profile.rank_weekly ?? 0) > 0 && (
        <ReferRankBadgeMulti
          rank={profile.rank_weekly}
          period="weekly"
          alwaysOpen
        />
      )}
      {(profile.rank_monthly ?? 0) > 0 && (
        <ReferRankBadgeMulti
          rank={profile.rank_monthly}
          period="monthly"
          alwaysOpen
        />
      )}
      {(profile.rank_daily ?? 0) > 0 && (
        <ReferRankBadgeMulti
          rank={profile.rank_daily}
          period="daily"
          alwaysOpen
        />
      )}
    </motion.div>
  )}
</AnimatePresence>


          {/* Name */}

<div className="mt-3 flex items-center justify-center gap-2">
  <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
  {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
    <VerifiedBadge
      verified={true}
      verifiedCount={
        (profile.verified_links_count ?? 0) +
        (profile.address_verified ? 1 : 0)
      }
    />
  )}
</div>

{/* Biography (only if present) */}
{profile.bio && profile.bio.trim() !== "" && (
  <p className="mt-1 text-sm text-gray-700 text-center max-w-[90%] mx-auto whitespace-pre-line break-words">
    {profile.bio}
  </p>
)}



{/* Dates */}
<p className="mt-3 text-xs text-gray-500 flex flex-wrap justify-center gap-x-1 gap-y-0.5">
  <span className="whitespace-nowrap">
    Joined{" "}
    {new Date(profile.joined_at || profile.created_at || profile.since).toLocaleString("default", {
      month: "short",
      year: "numeric",
    })}
  </span>

  <span className="opacity-70 transition-opacity duration-300" aria-hidden="true">•</span>

  <span className="whitespace-nowrap">
    Last verified{" "}
    {profile.last_verified_at || profile.last_verified ? (
      `${Math.max(
        0,
        Math.round(
          (Date.now() -
            new Date(profile.last_verified_at || profile.last_verified).getTime()) /
            (1000 * 60 * 60 * 24 * 7)
        )
      )} weeks ago`
    ) : (
      "N/A"
    )}
  </span>

  <span className="opacity-70 transition-opacity duration-300" aria-hidden="true">•</span>

  <span className="whitespace-nowrap">
    Good thru{" "}
    {profile.good_thru
      ? new Date(profile.good_thru).toLocaleString("default", {
          month: "short",
          year: "numeric",
        })
      : "NULL"}
  </span>
</p>


{/* Address with integrated copy button and feedback */}
{profile.address ? (
  <div className="mt-2 flex items-center justify-center">
    <div
      className={`flex items-center gap-2 border text-gray-700 font-mono text-sm rounded-full px-3 py-1.5 shadow-sm w-fit max-w-[90%] transition-colors duration-300 ${
        copied ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50"
      }`}
    >
  <span className="select-all" title={profile.address}>
  {profile.address
    ? `${profile.address.slice(0, 6)}...${profile.address.slice(-6)}`
    : "—"}
</span>

{/* QR + Copy Buttons with animated label expansion */}
<div className="flex items-center gap-1 whitespace-nowrap">
  {/* QR Button */}
  <button
    onClick={() => {
      if (typeof setSelectedAddress === "function") setSelectedAddress(profile.address);
      if (typeof setForceShowQR === "function") setForceShowQR(true);
      if (typeof setQRShown === "function") setQRShown(true);
      setTimeout(() => {
        const el = document.getElementById("zcash-feedback");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 1);
    }}
    className="group flex items-center justify-center text-gray-500 hover:text-blue-600 transition-all px-1 overflow-hidden"
    title="Show QR"
  >
    ▣
    <span className="inline-block max-w-0 group-hover:max-w-[60px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1">
      QR
    </span>
  </button>

  {/* Copy Button */}
  <button
    onClick={() => {
      navigator.clipboard.writeText(profile.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }}
    className={`group flex items-center justify-center transition-all px-1 overflow-hidden ${
      copied
        ? "text-green-600 hover:text-green-600"
        : "text-gray-500 hover:text-blue-600"
    }`}
    title={copied ? "Copied!" : "Copy address"}
  >
    {copied ? "☑" : "⧉"}
    <span className="inline-block max-w-0 group-hover:max-w-[50px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1">
      {copied ? "Copied!" : "Copy"}
    </span>
  </button>
</div>
    </div>
  </div>
) : (
  <p className="mt-2 text-sm text-gray-500 italic">—</p>
)}



          {/* Action tray */}
<div
  className="relative flex flex-col items-center w-full max-w-md mx-auto rounded-2xl border border-gray-300 bg-white/80 backdrop-blur-sm shadow-inner transition-all overflow-hidden mt-5 pb-0"
>
  {/* Links tray only */}
  <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
    <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
      {linksArray.length > 0 ? (
        linksArray.map((link) => (
          <div
            key={link.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 truncate">
                {link.label || "Untitled"}
              </span>
              <VerifiedBadge verified={link.is_verified} />
            </div>
            <div className="flex items-center gap-2 mt-0.5 sm:mt-0 text-sm text-gray-600 truncate max-w-full sm:max-w-[60%]">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-blue-600 transition-colors"
              >
                {link.url.replace(/^https?:\/\//, "")}
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(link.url)}
                title="Copy link"
                className="text-gray-400 hover:text-blue-600 transition-colors text-sm"
              >
                ⧉
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="italic text-gray-500 text-center">
          No contributed links yet.
        </p>
      )}
    </div>
  </div>
</div>

          {/* Warning */}
          {warning && (
            <div
              className={`mt-5 text-xs rounded-md px-4 py-2 border text-center mx-auto w-fit transition-colors duration-300 ${
                hasVerifiedContent
                  ? "text-green-600 bg-green-50 border-green-200"
                  : hasUnverifiedLinks
                  ? "text-gray-800 bg-yellow-50 border-yellow-200"
                  : "text-red-500 bg-red-50 border-red-200"
              }`}
            >
              {hasVerifiedContent ? (
                <span className="inline-flex items-center gap-1">
                  {CheckIcon}
                  <strong>{profile.name}</strong> appears to be verified.
                </span>
              ) : hasUnverifiedLinks ? (
                <>
                  ⚠ <strong>{profile.name}</strong> has contributed links, but
                  none are verified.
                </>
              ) : (
                <>
                  ⚠ <strong>{profile.name}</strong> may not be who you think.
                </>
              )}

              <button
                onClick={() => setShowDetail(!showDetail)}
                className={`ml-2 hover:underline text-xs font-semibold ${
                  hasVerifiedContent
                    ? "text-green-600"
                    : hasUnverifiedLinks
                    ? "text-gray-800"
                    : "text-blue-500"
                }`}
              >
                {showDetail ? "Hide" : "More"}
              </button>

            {showDetail && (
  <div className="mt-1 text-xs space-y-1">
    {hasVerifiedContent ? (
      <div className="text-gray-700">

        <div>{profile.name} verified their address with OTP.</div>
        <div>
  {profile.name} verified{" "}
  {verifiedLinks > 0
    ? `${verifiedLinks} of ${totalLinks} link${totalLinks !== 1 ? "s" : ""}`
    : "links"}{" "}
  with OTP.
</div>
      </div>
    ) : hasUnverifiedLinks ? (
      <div className="text-gray-800 space-y-1">
        <div>
          {profile.name} can verify their address or links to increase trust and
          visibility.
        </div>
      </div>
    ) : (
      !profile.address_verified && (
        <div className="text-gray-800 space-y-1">
          <div> There are other profiles with this name.</div>
          <div>
            {" "}
            {totalLinks > 0
              ? `${profile.name} has contributed ${totalLinks} link${
                  totalLinks !== 1 ? "s" : ""
                }, but ${
                  verifiedLinks > 0
                    ? `only ${verifiedLinks} ${
                        verifiedLinks === 1 ? "is" : "are"
                      } verified.`
                    : "none are verified."
                }`
              : `${profile.name} has not contributed any verified links.`}
          </div>
        </div>
      )
    )}
  </div>
)}


            </div>
          )}
        </div>

{/* BACK SIDE (auto-expand editable) */}
<div
  className={`absolute inset-0 rotate-y-180 backface-hidden top-0 left-0 w-full ${
    showBack ? "relative h-auto" : ""
  } bg-white backdrop-blur-sm rounded-2xl border border-gray-300 shadow-inner p-5 flex flex-col items-center justify-start overflow-visible`}
>
  <div className="absolute top-4 left-4 z-10">
    <button
onClick={() => {
  setShowBack(false);
  window.dispatchEvent(new CustomEvent("enterDraftMode"));
}}
      title="Return to front"
      aria-label="Return to front"
      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all shadow-md"
    >
      🡄 
    </button>
  </div>

<div className="relative">
  <h3 className="text-lg font-semibold text-gray-700 text-center">Edit Profile</h3>
</div>

  <ProfileEditor profile={profile} />
</div>


      </div>

      <style>{`
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </VerifiedCardWrapper>
  );
}
