import { useState, useRef, useEffect } from "react";
import isNewProfile from "../utils/isNewProfile";
import CopyButton from "./CopyButton";
import { useFeedback } from "../store";
import VerifiedBadge from "./VerifiedBadge";
import VerifiedCardWrapper from "./VerifiedCardWrapper";
import ReferRankBadge from "./ReferRankBadge";
import ProfileEditor from "./ProfileEditor";

import { motion } from "framer-motion";

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
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
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
              ✖ Remove
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
  const [showStats, setShowStats] = useState(false);
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

console.log("Profile image URL for", profile.name, "=>", finalUrl);


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
  const verifiedAddress = !!profile.address_verified;
  const totalLinks = profile.total_links ?? (profile.links?.length || 0);
  const verifiedLinks =
    profile.verified_links_count ??
    (profile.links?.filter((l) => l.is_verified).length || 0);
  const hasVerifiedContent = verifiedAddress || verifiedLinks > 0;
  const hasUnverifiedLinks =
    (profile.total_links ?? profile.links?.length ?? 0) > 0 &&
    verifiedLinks === 0;

  const totalVerifications = (verifiedAddress ? 1 : 0) + verifiedLinks;

  const isVerified = totalVerifications > 0;
  const hasReferrals = (profile.referral_count ?? 0) > 0;
  const isRanked =
    hasReferrals &&
    profile.referral_rank &&
    profile.referral_rank > 0 &&
    profile.referral_rank <= 10;

  // ordinal helper for rank
  const ordinal = (n) => {
    if (!n || typeof n !== "number") return "";
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  let circleClass = "bg-blue-400";
  if (isVerified && isRanked) {
    circleClass = "bg-gradient-to-b from-green-400 to-orange-400";
  } else if (isVerified) {
    circleClass = "bg-green-400";
  } else if (isRanked) {
    circleClass = "bg-orange-400";
  } else if (hasReferrals) {
    circleClass = "bg-orange-300";
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
              {profile.referral_rank > 0 && (
                <ReferRankBadge rank={profile.referral_rank} />
              )}
              {isNewProfile(profile) && (
                <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-sm">
                  NEW
                </span>
              )}
            </span>

            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-snug">
              {(profile.address_verified ||
              (profile.verified_links_count ?? 0) > 0) ? (
                <VerifiedBadge
                  verified={true}
                  verifiedCount={
                    (profile.verified_links_count ?? 0) +
                    (profile.address_verified ? 1 : 0)
                  }
                />
              ) : (
                <span className="text-red-400">Unverified</span>
              )}
              <span className="text-gray-400">•</span>
              <span>
                Joined{" "}
                {new Date(profile.since).toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
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
          {/* Top-left more menu */}
          <div className="absolute top-4 left-4 z-10 backface-hidden">
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
                  {!showStats ? (
                    <button
                      onClick={() => {
                        setShowStats(true);
                        setShowLinks(false);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50"
                    >
                      ◔ Show Stats
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowStats(false);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50"
                    >
                      ◕ Hide Stats
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowBack(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50"
                  >
                    ✎ Edit Card
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BACK SIDE BUTTON (⟲) */}
          <div className="absolute top-4 left-4 z-10 rotate-y-180 backface-hidden">
            <div className="absolute top-4 left-4">
              <button
                onClick={() => setShowBack(false)}
                title="Return to front"
                className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <span className="text-lg leading-none select-none">⟲</span>
              </button>
            </div>
          </div>

          {/* Top-right verified badge */}
          <div className="absolute top-4 right-4">
            {profile.address_verified ||
            (profile.verified_links_count ?? 0) > 0 ? (
              <VerifiedBadge
                verified={true}
                verifiedCount={
                  (profile.verified_links_count ?? 0) +
                  (profile.address_verified ? 1 : 0)
                }
              />
            ) : (
              <VerifiedBadge verified={false} />
            )}
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

          {/* Name */}
          <h2 className="mt-3 text-2xl font-bold text-gray-800">{profile.name}</h2>

          {/* Address */}
          <p className="mt-2 text-sm text-gray-600 font-mono select-all">
            {profile.address ? (
              <>
                {profile.address.slice(0, 10)}…{profile.address.slice(-10)}
              </>
            ) : (
              "—"
            )}
          </p>

          {/* Referrer badge (unchanged) */}
          <div className="mt-2 flex flex-col items-center justify-center gap-1">
            {profile.referral_rank > 0 && (
              <ReferRankBadge rank={profile.referral_rank} />
            )}
          </div>

          {/* Dates */}
          <p className="mt-3 text-xs text-gray-500">
            Joined{" "}
            {new Date(profile.since).toLocaleString("default", {
              month: "short",
              year: "numeric",
            })}{" "}
            • Last signed{" "}
            {profile.last_signed_at
              ? new Date(profile.last_signed_at).toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                })
              : "NULL"}{" "}
            • Good thru{" "}
            {profile.good_thru
              ? new Date(profile.good_thru).toLocaleString("default", {
                  month: "short",
                  year: "numeric",
                })
              : "NULL"}
          </p>

          {/* Action tray */}
          <div
            className={`relative flex flex-col items-center w-full max-w-md mx-auto rounded-2xl border border-gray-300 bg-white/80 backdrop-blur-sm shadow-inner transition-all overflow-hidden mt-5 ${
              showLinks ? "pb-0" : ""
            }`}
          >
            {/* Buttons */}
            <div className="p-3 flex flex-wrap justify-center gap-3 border-b border-gray-200 w-full">
              <CopyButton text={profile.address} label="Copy Uaddr" />

              <button
                onClick={() => {
                  setSelectedAddress(profile.address);
                  setForceShowQR(true);
                  setQRShown(true);
                  setTimeout(() => {
                    const el = document.getElementById("zcash-feedback");
                    if (el)
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 1);
                }}
                className="flex items-center justify-center gap-1 border rounded-xl px-3 h-8 py-1.5 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all sm:basis-[48%]"
              >
                ▣ Show QR
              </button>

              {/* Share */}
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/${profile.name
                    .normalize("NFKC")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, "")}`;
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
                  }
                }}
                className="flex items-center justify-center gap-2 border rounded-xl px-3 py-1.5 h-8 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all sm:basis-[48%]"
                aria-label={`Share ${profile.name}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="inline-block transform -rotate-90"
                >
                  <circle cx="6.5" cy="17.5" r="2" fill="currentColor" />
                  <circle cx="17.5" cy="17.5" r="2" fill="currentColor" />
                  <circle cx="12" cy="6.5" r="2" fill="currentColor" />
                  <path
                    d="M12 8.5v6.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.5 15.5l5.2-4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17.5 15.5l-5.2-4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="ml-1">Share</span>
              </button>

              {/* Show Links */}
              <button
                onClick={() => {
                  setShowLinks((prev) => !prev);
                  setShowStats(false);
                }}
                className="flex items-center justify-center gap-1 border rounded-xl px-3 py-1.5 h-8 text-sm border-gray-400 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all sm:basis-[48%]"
              >
                {showLinks ? "⎘ Hide Links" : "⌹ Show Links"}
              </button>
            </div>

            {/* Expandable tray */}
            <div
              className={`w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden ${
                showLinks || showStats
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
                {showLinks && (
                  <>
                    {profile.links && profile.links.length > 0 ? (
                      profile.links.map((link) => (
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
                              onClick={() =>
                                navigator.clipboard.writeText(link.url)
                              }
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
                  </>
                )}

                {showStats && (
                  <div className="text-sm text-gray-700 text-left space-y-2">
                    {hasReferrals && (
                      <p className="font-medium">
                        Referred {profile.referral_count} User
                        {profile.referral_count !== 1 ? "s" : ""}{" "}
                        {isRanked
                          ? `(${ordinal(
                              profile.referral_rank
                            )} place, all-time)`
                          : ""}
                      </p>
                    )}
                    <p className="italic text-gray-600">
                      More stats coming soon for{" "}
                      <strong>{profile.name}</strong>…
                    </p>

                    {/* NEW Close link */}
                    <p
                      onClick={() => setShowStats(false)}
                      className="mt-2 text-xs font-semibold text-gray-500 hover:text-blue-600 hover:underline cursor-pointer transition-opacity duration-300"
                    >
                      Close
                    </p>
                  </div>
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
                  ✖ <strong>{profile.name}</strong> may not be who you think.
                </>
              )}

              <button
                onClick={() => setShowDetail(!showDetail)}
                className={`ml-2 hover:underline text-xs font-semibold ${
                  hasVerifiedContent
                    ? "text-green-600"
                    : hasUnverifiedLinks
                    ? "text-gray-800"
                    : "text-red-500"
                }`}
              >
                {showDetail ? "Hide" : "More"}
              </button>

              {showDetail && (
                <span
                  className={`block mt-1 ${
                    hasVerifiedContent
                      ? "text-green-600"
                      : hasUnverifiedLinks
                      ? "text-gray-800"
                      : "text-red-500"
                  }`}
                >
                  {profile.name} added {totalLinks} link
                  {totalLinks !== 1 ? "s" : ""}, {verifiedLinks}{" "}
                  {verifiedLinks === 1 ? "is" : "are"} verified.
                </span>
              )}
            </div>
          )}
        </div>

{/* BACK SIDE (auto-expand editable) */}
<div
  className={`absolute inset-0 rotate-y-180 backface-hidden top-0 left-0 w-full ${
    showBack ? "relative h-auto" : ""
  } bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-300 shadow-inner p-6 flex flex-col items-center justify-start overflow-visible`}
>
  <div className="absolute top-4 left-4 z-10">
    <button
      onClick={() => setShowBack(false)}
      title="Return to front"
      aria-label="Return to front"
      className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all shadow-md"
    >
      ⟲
    </button>
  </div>

  <h3 className="text-lg font-semibold text-gray-700 mb-3">Edit Profile</h3>
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
