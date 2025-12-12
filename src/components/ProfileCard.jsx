import { useState, useRef, useEffect } from "react";
import isNewProfile from "../utils/isNewProfile";
import CopyButton from "./CopyButton";
import { useFeedback } from "../store";
import VerifiedBadge from "./VerifiedBadge";
import VerifiedCardWrapper from "./VerifiedCardWrapper";
import ReferRankBadgeMulti from "./ReferRankBadgeMulti";
import ProfileEditor from "./ProfileEditor";
import shareIcon from "../assets/share.svg";
// --- Domain utils + favicon maps ---
import { extractDomain, betweenTwoPeriods } from "../utils/domainParsing.js";
import { KNOWN_DOMAINS, FALLBACK_ICON } from "../utils/domainLabels.js";

import SubmitOtp from "../SubmitOtp.jsx";
import CheckIcon from "../assets/CheckIcon.jsx";
import { motion, AnimatePresence  } from "framer-motion";







// Caching and CDN settings
const memoryCache = new Map();

export default function ProfileCard({ profile, onSelect, warning, fullView = false }) {
  const [showLinks, setShowLinks] = useState(false);
    const [isOtpOpen, setIsOtpOpen] = useState(false);

  // 🔗 Lazy-load links from Supabase when needed
// (linksArray state/effect is defined later; duplicate removed)

  const [showStats, setShowStats] = useState(false);
  const hasAwards =
  (profile?.rank_alltime ?? 0) > 0 ||
  (profile?.rank_weekly ?? 0) > 0 ||
  (profile?.rank_monthly ?? 0) > 0 ||
  (profile?.rank_daily ?? 0) > 0;

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
const isTwitter = rawUrl.includes("pbs.twimg.com");

const finalUrl = isTwitter
  ? rawUrl                          // do NOT append anything to Twitter
  : rawUrl.includes("?")
  ? rawUrl                           // already has query params → leave it
  : `${rawUrl}?v=${profile.last_signed_at || profile.created_at}`;



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

 
  }
};

  const handleEnterDraft = () => {
    setShowBack(false);
  };
// window.addEventListener("enterSignInMode", e => {
//  console.log("ENTER-SIGNIN fired with:", e.detail);
// });

  window.addEventListener("enterSignInMode", handleEnterSignIn);
  window.addEventListener("enterDraftMode", handleEnterDraft);
  return () => {
    window.removeEventListener("enterSignInMode", handleEnterSignIn);
    window.removeEventListener("enterDraftMode", handleEnterDraft);
  };
}, [profile?.id, profile?.address]);

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
    Date.now() - 1000 * 60 * 60 * 24 * 90;

// --- Local favicon + label resolver ---
function enrichLink(link) {
  const domain = extractDomain(link.url);

  if (KNOWN_DOMAINS[domain]) {
    return {
      ...link,
      label: KNOWN_DOMAINS[domain].label,
      icon: KNOWN_DOMAINS[domain].icon,
    };
  }

  return {
    ...link,
    label: link.label || betweenTwoPeriods(domain) || "Unknown",
    icon: FALLBACK_ICON,
  };
}

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
    if (Array.isArray(data)) setLinksArray(data.map(enrichLink));
  });
}, [showLinks, profile?.id]);
const totalLinks = profile.total_links ?? (Array.isArray(linksArray) ? linksArray.length : 0);


const hasUnverifiedLinks =
  (profile.total_links ?? linksArray.length ?? 0) > 0 &&
  verifiedLinks === 0;


  const hasReferrals = (profile.referral_count ?? 0) > 0;


let rankType = null;
if (profile.rank_alltime > 0) rankType = "alltime";
else if (profile.rank_weekly > 0) rankType = "weekly";
else if (profile.rank_monthly > 0) rankType = "monthly";
else if (profile.rank_daily > 0) rankType = "daily";


let circleClass = "bg-blue-500"; // default = All

if (isVerified && rankType) {
  circleClass = "bg-gradient-to-r from-green-400 to-orange-500";
} else if (isVerified) {
  circleClass = "bg-green-500";
} else if (rankType) {
  if (rankType === "alltime") {
    circleClass = "bg-gradient-to-r from-blue-500 to-red-500";
  } else if (rankType === "weekly") {
    circleClass = "bg-gradient-to-r from-blue-500 to-orange-500";
  } else if (rankType === "monthly") {
    circleClass = "bg-gradient-to-r from-blue-500 to-red-500";
  } else if (rankType === "daily") {
    circleClass = "bg-gradient-to-r from-blue-500 to-cyan-500";
  }
} else {
  circleClass = "bg-blue-500";
}






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
    // referrerPolicy="strict-origin-when-cross-origin"
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


  {/* Show dot only if there are any referral badges */}
  {((profile.rank_alltime ?? 0) > 0 ||
    (profile.rank_weekly ?? 0) > 0 ||
    (profile.rank_monthly ?? 0) > 0 ||
    (profile.rank_daily ?? 0) > 0) && (
    <span className="text-gray-400">•</span>
  )}

{["alltime", "weekly", "monthly", "daily"].map(period => {
  const rank = profile[`rank_${period}`];
  return rank > 0 && <ReferRankBadgeMulti key={period} rank={rank} period={period.replace("time","")} />;
})}
</div>
          </div>
        </div>
      {isOtpOpen && (
  <SubmitOtp
    isOpen={isOtpOpen}
    onClose={() => setIsOtpOpen(false)}
    profile={profile}
  />
)}

{isOtpOpen && (
  <SubmitOtp
    isOpen={isOtpOpen}
    onClose={() => setIsOtpOpen(false)}
    profile={profile}
  />
)}
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
 ↺ Edit Profile
        </button>

        <button
  onClick={() => {
    setMenuOpen(false);
    setIsOtpOpen(true);
  }}
  className="w-full text-left px-4 py-2 hover:bg-blue-50"
>
⛨ Enter Passcode
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
    // referrerPolicy="strict-origin-when-cross-origin"
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
  {profile.nearest_city_name && (
    <>
      <span className="whitespace-nowrap">
        Near {profile.nearest_city_name}
      </span>

      <span
        className="opacity-70 transition-opacity duration-300"
        aria-hidden="true"
      >
        •
      </span>
    </>
  )}

  <span className="whitespace-nowrap">
    Joined{" "}
    {new Date(
      profile.joined_at || profile.created_at || profile.since
    ).toLocaleString("default", {
      month: "short",
      year: "numeric",
    })}
  </span>

  <span
    className="opacity-70 transition-opacity duration-300"
    aria-hidden="true"
  >
    •
  </span>

  <span className="whitespace-nowrap">
    Verified{" "}
    {profile.last_verified_at || profile.last_verified
      ? (() => {
          const ts = new Date(
            profile.last_verified_at || profile.last_verified
          ).getTime();
          const weeks =
            (Date.now() - ts) / (1000 * 60 * 60 * 24 * 7);

          if (weeks < 1) return "<1 week ago";
          if (weeks < 2) return "<2 weeks ago";
          if (weeks < 3) return "<3 weeks ago";
          if (weeks < 4) return "<4 weeks ago";
          return "<1 month ago";
        })()
      : "N/A"}
  </span>

  <span
    className="opacity-70 transition-opacity duration-300"
    aria-hidden="true"
  >
    •
  </span>

  <span className="whitespace-nowrap">
    Good thru{" "}
    {profile.verif_expires_at
      ? new Date(profile.verif_expires_at).toLocaleString("default", {
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
  className="flex items-center gap-2 border text-gray-700 font-mono text-sm rounded-full px-3 py-1.5 shadow-sm w-fit max-w-[90%] border-gray-300 bg-gray-50"
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
console.log("QR BUTTON CLICKED — should trigger scroll + QR");
if (typeof setSelectedAddress === "function") {
  setSelectedAddress(profile.address);
}

// Explicit QR-open request (ONLY triggered by QR icon click)
if (typeof setForceShowQR === "function") {
  setForceShowQR(Date.now()); 
}

// Scroll ONLY because user intentionally pressed QR button
setTimeout(() => {
  const el = document.getElementById("zcash-feedback");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}, 400);


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
<CopyButton text={profile.address} label="Copy" copiedLabel="Copied" />
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
  <img
    src={link.icon}
    alt=""
    className="w-4 h-4 rounded-sm opacity-80"
  />
  <span className="font-medium text-gray-800 truncate">
    {link.label}
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
<CopyButton text={link.url} label="Copy" copiedLabel="Copied" />


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
    <span className="h-4 w-4 inline-flex items-center justify-center text-green-600">
      <CheckIcon className="h-4 w-4 text-green-600" />

    </span>
    <strong>{profile.name}</strong> appears to be authentic.
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
  // tell feedback NOT to auto-scroll
  window.skipZcashFeedbackScroll = true;

  setShowBack(false);
  window.dispatchEvent(new CustomEvent("enterDraftMode"));
  window.dispatchEvent(new CustomEvent("forceFeedbackNoteMode"));
}}

      title="Return to front"
      aria-label="Return to front"
      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all shadow-md"
    >
<span>↺</span> {/* ⮌ left arrow, opposite of ⮎ */}

 
    </button>
  </div>


  <ProfileEditor profile={profile} links={linksArray} />
</div>


      </div>

      <style>{`
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>

      
    {isOtpOpen && (
  <SubmitOtp
    isOpen={isOtpOpen}
    onClose={() => setIsOtpOpen(false)}
    profile={profile}
  />
)}
</VerifiedCardWrapper>
  );
}