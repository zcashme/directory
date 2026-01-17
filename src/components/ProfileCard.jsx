"use client";

import { useState, useRef, useEffect } from "react";
import isNewProfile from "../utils/isNewProfile";
import CopyButton from "./CopyButton";
import { useFeedback } from "../hooks/useFeedback";
import VerifiedBadge from "./VerifiedBadge";
import VerifiedCardWrapper from "./VerifiedCardWrapper";
import ReferRankBadgeMulti from "./ReferRankBadgeMulti";
import ProfileEditor from "./ProfileEditor";
import ProfileAvatar from "./ProfileAvatar";
import shareIcon from "../assets/share.svg";
// --- Domain utils + favicon maps ---
import { extractDomain, betweenTwoPeriods } from "../utils/domainParsing.js";
import { KNOWN_DOMAINS, FALLBACK_ICON } from "../utils/domainLabels.js";
import { getSocialHandle } from "../utils/linkUtils";
import {
  getAuthProviderForUrl,
  getLinkAuthToken,
  isLinkAuthPending,
  appendLinkToken,
  startOAuthVerification,
} from "../utils/linkAuthFlow";
import AuthExplainerModal from "./AuthExplainerModal";

import SubmitOtp from "../SubmitOtp.jsx";
import { motion, AnimatePresence } from "framer-motion";
const Motion = motion;

function RedirectModal({ isOpen, label }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
        <div className="mb-4 text-blue-500">
          <svg className="w-12 h-12 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Redirecting to {label}</h3>
        <p className="text-sm text-gray-600">
          Please authorize the app to verify your profile.
        </p>
      </div>
    </div>
  );
}






// Caching and CDN settings
const memoryCache = new Map();

export default function ProfileCard({ profile, onSelect, warning, fullView = false }) {
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [authInfoOpen, setAuthInfoOpen] = useState(false);
  const [authLink, setAuthLink] = useState(null);
  const [authRedirectOpen, setAuthRedirectOpen] = useState(false);
  const [authRedirectLabel, setAuthRedirectLabel] = useState("X.com");

  // ðŸ”— Lazy-load links from Supabase when needed
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
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  // image cache and lazy load setup
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const rawUrl = profile.profile_image_url || "";
  const isTwitter = rawUrl.includes("pbs.twimg.com");

  const finalUrl = isTwitter
    ? rawUrl                          // do NOT append anything to Twitter
    : rawUrl.includes("?")
      ? rawUrl                           // already has query params â†’ leave it
      : `${rawUrl}?v=${profile.last_signed_at || profile.created_at}`;



  useEffect(() => {
    const profileId = profile?.id || null;
    const profileAddress = profile?.address || "";
    const profileName = profile?.name || "";
    const profileVerified = !!(profile?.address_verified);
    const profileSince = profile?.joined_at || profile?.created_at || profile?.since || null;

    const handleEnterSignIn = (e) => {
      setShowBack(true);

      // Forward the event payload when triggered from other sources
      if (!e?.detail && profileId && profileAddress) {
        // âœ… Guard: only dispatch if profile data is ready
        if (!profileId || !profileAddress) {
          console.warn("ProfileCard: profile not ready, skipping verify dispatch");
        } else {
          window.dispatchEvent(
            new CustomEvent("enterSignInMode", {
              detail: {
                zId: profileId,
                address: profileAddress,
                name: profileName,
                verified: profileVerified,
                since: profileSince,
              },
            })
          );

          // âœ… Cache last known payload in case event fires before listener is attached
          window.lastZcashFlipDetail = {
            zId: profileId,
            address: profileAddress,
            name: profileName,
            verified: profileVerified,
            since: profileSince,
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
  }, [profile?.id, profile?.address, profile?.name, profile?.joined_at, profile?.created_at, profile?.since, profile?.address_verified]);

  // Auto-flip disabled: keep ProfileCard visible after auth return.



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
      { rootMargin: "200px", threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [finalUrl, fullView]);

  useEffect(() => {
    // Always make visible for fullView or if already cached
    if (fullView || memoryCache.has(finalUrl)) {
      setVisible(true);
      return;
    }
  }, [finalUrl, fullView]);



  const { setSelectedAddress, setForceShowQR, pendingEdits, setPendingEdits } = useFeedback();

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
  const canAuthenticateLinks = !!profile.address_verified;
  const selectedAuthProvider = authLink ? getAuthProviderForUrl(authLink.url) : null;
  const authToken = authLink ? getLinkAuthToken(authLink) : null;
  const authPending = authToken && isLinkAuthPending(pendingEdits, authToken);

  const handleAuthBadgeClick = (event, link) => {
    event.stopPropagation();
    if (!link || link.is_verified) return;
    setAuthLink(link);
    setAuthInfoOpen(true);
  };

  const handleAuthenticateLink = () => {
    if (!authLink) return;
    if (!canAuthenticateLinks) return;
    if (selectedAuthProvider) {
      startOAuthVerification({
        providerKey: selectedAuthProvider.key,
        profile,
        url: authLink.url,
        setShowRedirect: setAuthRedirectOpen,
        setRedirectLabel: setAuthRedirectLabel,
      });
      return;
    }
    if (!authToken || authPending) return;
    appendLinkToken(pendingEdits, setPendingEdits, authToken);
    setAuthInfoOpen(false);
  };



  // --- Local favicon + label resolver ---
  function enrichLink(link) {
    const domain = extractDomain(link.url);
    const dbLabel = (link.label || "").trim();
    const handle = getSocialHandle(link.url || "");
    const normalizedDomain = (domain || "").toLowerCase();
    const normalizedHandle = (handle || "").toLowerCase();
    const normalizedLabel = dbLabel.toLowerCase();
    const isHandleDomain =
      normalizedHandle === normalizedDomain ||
      normalizedHandle === `www.${normalizedDomain}`;
    const domainLabel = (KNOWN_DOMAINS[domain]?.label || "").toLowerCase();
    const shouldUseHandle =
      !!handle &&
      !isHandleDomain &&
      (!dbLabel ||
        normalizedLabel === normalizedDomain ||
        normalizedLabel === `www.${normalizedDomain}` ||
        normalizedLabel === domainLabel ||
        normalizedLabel.startsWith(`${normalizedDomain}/`) ||
        normalizedLabel.startsWith(`www.${normalizedDomain}/`));

    if (KNOWN_DOMAINS[domain]) {
      return {
        ...link,
        label: (shouldUseHandle ? handle : dbLabel) || KNOWN_DOMAINS[domain].label,
        icon: KNOWN_DOMAINS[domain].icon,
      };
    }

    return {
      ...link,
      label:
        (shouldUseHandle ? handle : dbLabel) ||
        betweenTwoPeriods(domain) ||
        "Unknown",
      icon: FALLBACK_ICON,
    };
  }

  const [linksArray, setLinksArray] = useState(() => {
    let rawLinks = [];
    if (Array.isArray(profile.links)) rawLinks = profile.links;
    else if (typeof profile.links_json === "string") {
      try {
        rawLinks = JSON.parse(profile.links_json);
      } catch {
        rawLinks = [];
      }
    } else if (Array.isArray(profile.links_json)) {
      rawLinks = profile.links_json;
    }
    return rawLinks.map(enrichLink);
  });

  // dY", whenever "Show Links" is opened, fetch live links from Supabase
  useEffect(() => {
    if (!profile?.id) return;
    let isMounted = true;
    setIsLoadingLinks(true);

    import("../supabase").then(async ({ supabase }) => {
      const { data, error } = await supabase
        .from("zcasher_links")
        .select("id,label,url,is_verified")
        .eq("zcasher_id", profile.id)
        .order("id", { ascending: true });

      if (error) {
        console.error("ƒ?O Error fetching links:", error);
        if (isMounted) setIsLoadingLinks(false);
        return;
      }
      if (Array.isArray(data) && isMounted) setLinksArray(data.map(enrichLink));
      if (isMounted) setIsLoadingLinks(false);
    });
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);
  const totalLinks = profile.total_links ?? (Array.isArray(linksArray) ? linksArray.length : 0);



  const normalizedName = (value = "") =>
    value
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/ /g, "_");

  const formatUsername = (value = "") =>
    value.trim().replace(/\s+/g, "_");

  const cachedProfiles =
    typeof window !== "undefined" ? window.cachedProfiles : null;

  const duplicateNameCountFromProfile =
    typeof profile.duplicate_name_count === "number"
      ? profile.duplicate_name_count
      : typeof profile.name_duplicate_count === "number"
        ? profile.name_duplicate_count
        : typeof profile.duplicate_names_count === "number"
          ? profile.duplicate_names_count
          : typeof profile.name_duplicates_count === "number"
            ? profile.name_duplicates_count
            : null;

  const computedDuplicateNameCount =
    Array.isArray(cachedProfiles) && profile?.name
      ? cachedProfiles.filter(
        (p) => normalizedName(p?.name) === normalizedName(profile.name)
      ).length
      : null;

  const duplicateNameCount =
    duplicateNameCountFromProfile ?? computedDuplicateNameCount ?? 0;

  const hasDuplicateNames = duplicateNameCount > 1;

  const warningConfig = (() => {
    if (!warning) return null;
    const name = profile?.display_name || profile?.name || "This profile";
    const nameSearchUrl = profile?.name
      ? `/?search=${encodeURIComponent(profile.name)}`
      : "/";
    const hasLinks = totalLinks > 0;
    const hasAuthenticatedLinks = verifiedLinks > 0;

    if (!verifiedAddress) {
      if (!hasLinks && hasDuplicateNames) {
        return {
          tone: "red",
          summary: `⚠ ${name} may not be who you think.`,
          toggleLabel: "Warnings",
          defaultExpanded: false,
          details: [
            <>
              Multiple profiles use this{" "}
              <a
                href={nameSearchUrl}
                className="text-blue-600 hover:underline"
                onClick={(event) => {
                  if (event.button !== 0) return;
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("suppressSearchDropdown", "1");
                  }
                }}
              >
                name
              </a>
              .
            </>,
            "No links are available to verify that this address belongs to the same person.",
          ],
        };
      }

      if (!hasLinks) {
        return {
          tone: "red",
          summary: `⚠ ${name} may not be who you think.`,
          toggleLabel: "Warnings",
          details: [
            "No links are available to verify that this address belongs to the same person.",
            "Names can be impersonated.",
          ],
        };
      }

      if (hasDuplicateNames) {
        return {
          tone: "yellow",
          summary: `⚠ ${name} may not be who you think.`,
          toggleLabel: "Warnings",
          details: [
            <>
              Multiple profiles use this{" "}
              <a
                href={nameSearchUrl}
                className="text-blue-600 hover:underline"
                onClick={(event) => {
                  if (event.button !== 0) return;
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("suppressSearchDropdown", "1");
                  }
                }}
              >
                name
              </a>
              .
            </>,
            "Links are provided but their ownership has not been authenticated.",
          ],
        };
      }

      return {
        tone: "yellow",
        summary: `⚠ ${name} may not be who you think.`,
        toggleLabel: "Warnings",
        details: [
          "Links are provided but their ownership has not been authenticated.",
          "Names can be impersonated.",
        ],
      };
    }

    if (!hasLinks) {
      return {
        tone: "yellow",
        summary: "⚠ This address was recently active.",
        toggleLabel: "Warnings",
        details: [
          "No links are available to verify that this address belongs to the same person.",
          "Names can be impersonated.",
        ],
      };
    }

    if (hasAuthenticatedLinks) {
      return {
        tone: "positive",
        summary: "This address was recently active.",
        toggleLabel: "More",
        details: [
          "Authenticated links help confirm address belongs to same person.",
          "Names can be impersonated.",
        ],
      };
    }

    return {
      tone: "neutral",
      summary: "This address was recently active.",
      toggleLabel: "Caution",
      details: [
        "Links are provided to help verify identity, but ownership has not been authenticated.",
        "Names can be impersonated.",
      ],
    };
  })();

  useEffect(() => {
    if (!warningConfig) return;
    setShowDetail(!!warningConfig.defaultExpanded);
  }, [warningConfig?.summary, warningConfig?.toggleLabel, warningConfig?.tone, warningConfig?.defaultExpanded]);


  // referrals not used in this component


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
          onSelect(profile);
          requestAnimationFrame(() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          );
        }}
        className="rounded-2xl p-3 border transition-all cursor-pointer shadow-sm backdrop-blur-sm border-gray-500 bg-transparent hover:bg-gray-100/10 hover:shadow-[0_0_4px_rgba(0,0,0,0.05)] mb-2"
      >
        <div className="flex items-center gap-4 w-full">
          <ProfileAvatar
            profile={profile}
            size={45}
            imageClassName="object-contain"
            className="shadow-sm"
            showFallbackIcon
          />

          <div className="flex flex-col flex-grow overflow-hidden min-w-0">
            <span className="font-semibold text-blue-700 leading-tight truncate flex items-center gap-2">
              <span className="truncate">{profile.display_name || profile.name}</span>
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
                <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">
                  NEW
                </span>
              )}
            </span>
            <span className="text-xs font-medium text-gray-500 leading-tight">
              @{formatUsername(profile.name)}
            </span>

            <div className="text-sm text-gray-500 flex flex-col items-start gap-1 leading-snug mt-1">
              {/* Badges */}
              {(hasAwards) && (
                <div className="flex flex-wrap justify-start gap-x-2 gap-y-0.5">
                  {["alltime", "weekly", "monthly", "daily"].map(period => {
                    const rank = profile[`rank_${period}`];
                    return rank > 0 && <ReferRankBadgeMulti key={period} rank={rank} period={period.replace("time", "")} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {
          isOtpOpen && (
            <SubmitOtp
              isOpen={isOtpOpen}
              onClose={() => setIsOtpOpen(false)}
              profile={profile}
            />
          )
        }

        {
          isOtpOpen && (
            <SubmitOtp
              isOpen={isOtpOpen}
              onClose={() => setIsOtpOpen(false)}
              profile={profile}
            />
          )
        }
      </VerifiedCardWrapper >

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
        className={`relative transition-transform duration-500 transform-style-preserve-3d ${showBack ? "rotate-y-180" : ""
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
                      className={`w-full text-left px-4 py-2 transition-colors ${hasAwards
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
                      ⭔ Hide Awards
                    </button>
                  )}


                  <button
                    onClick={() => {
                      setShowBack(true);
                      setMenuOpen(false);
                      console.log("ðŸªª Dispatching enterSignInMode with:", profile.id, profile.address);

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
                const baseSlug = (profile.display_name || profile.name)
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
                      title: `${profile.display_name || profile.name} on Zcash.me`,
                      text: "Check out this Zcash profile:",
                      url: shareUrl,
                    })
                    .catch(() => { });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Profile link copied to clipboard!");
                }
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 bg-white/80 shadow-sm text-gray-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
              title={`Share ${profile.display_name || profile.name}`}
            >
              <img
                src={shareIcon}
                alt="Share"
                className="w-4 h-4 opacity-80 hover:opacity-100 transition-opacity"
              />
            </button>
          </div>




          {/* Avatar */}
          <ProfileAvatar
            profile={profile}
            size={80}
            imageClassName="object-contain"
            className="mx-auto shadow-sm flex items-center justify-center"
            showFallbackIcon
            blink
            lookAround
          />

          {/* Awards section (animated, appears when Show Awards is active) */}
          <AnimatePresence>
            {showStats && (
              <Motion.div
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
              </Motion.div>
            )}
          </AnimatePresence>


          {/* Name */}

          {/* Name & Username Layout */}
          <div className="mt-3 flex flex-col items-center">
            <h2 className="text-3xl font-black text-gray-900 leading-tight flex items-center justify-center gap-2">
              {profile.display_name || profile.name}
              {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
                <VerifiedBadge
                  verified={true}
                  verifiedCount={
                    (profile.verified_links_count ?? 0) +
                    (profile.address_verified ? 1 : 0)
                  }
                />
              )}
            </h2>
            <div className="text-base font-medium text-gray-500 mt-1">
              @{formatUsername(profile.name)}
            </div>
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

            </span>
            {/*
  <span className="whitespace-nowrap">
    â€¢ Good thru{" "}
    {profile.verif_expires_at
      ? new Date(profile.verif_expires_at).toLocaleString("default", {
          month: "short",
          year: "numeric",
        })
      : "NULL"}
  </span>
*/}
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
                    : "â€”"}
                </span>

                {/* QR + Copy Buttons with animated label expansion */}
                <div className="flex items-center gap-1 whitespace-nowrap">
                  {/* QR Button */}
                  <button
                    onClick={() => {
                      console.log("QR BUTTON CLICKED ▣ should trigger scroll + QR");
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
            <p className="mt-2 text-sm text-gray-500 italic">â€”</p>
          )}



          {/* Action tray */}
          <div
            className="relative flex flex-col items-center w-full max-w-md mx-auto rounded-2xl border border-gray-300 bg-white/80 backdrop-blur-sm shadow-inner transition-all overflow-hidden mt-5 pb-0"
          >
            {/* Links tray only */}
            <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
              <div className={isLoadingLinks ? "px-4 py-3 bg-transparent/70 border-t border-gray-200" : "px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2"}>
                {isLoadingLinks ? (
                  <div className="link-tray-shimmer h-10 w-full rounded-md" />
                ) : linksArray.length > 0 ? (
                  linksArray.map((link) => {
                    const isDiscordLink = /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com|discord\.gg)\//i.test(link.url || "");
                    const canLinkLeft = !(isDiscordLink && !link.is_verified);
                    return (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 py-1 border-b border-gray-100 last:border-0 min-w-0"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        {canLinkLeft ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 shrink-0 hover:text-blue-600 transition-colors"
                          >
                            <img
                              src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
                              alt=""
                              className="w-4 h-4 rounded-sm opacity-80"
                            />
                            <span className="font-medium text-gray-800 whitespace-nowrap">
                              {link.label}
                            </span>
                          </a>
                        ) : (
                          <>
                            <img
                              src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
                              alt=""
                              className="w-4 h-4 rounded-sm opacity-80"
                            />
                            <span className="font-medium text-gray-800 whitespace-nowrap">
                              {link.label}
                            </span>
                          </>
                        )}
                        <VerifiedBadge
                          verified={link.is_verified}
                          verifiedLabel="Authenticated"
                          unverifiedLabel="Not Authenticated"
                          onClick={
                            link.is_verified
                              ? undefined
                              : (event) => handleAuthBadgeClick(event, link)
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-auto min-w-0 text-sm text-gray-600 justify-end flex-1">
                        {(() => {
                          if (isDiscordLink && !link.is_verified) {
                            return (
                              <>
                                <span className="flex-1 min-w-0 truncate text-right">
                                  {link.label}
                                </span>
                                <div className="shrink-0">
                                  <CopyButton text={link.label} label="Copy" copiedLabel="Copied" />
                                </div>
                              </>
                            );
                          }
                          return (
                            <>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-0 truncate text-right hover:text-blue-600 transition-colors"
                              >
                                {extractDomain(link.url)}
                              </a>
                              <div className="shrink-0">
                                <CopyButton text={link.url} label="Copy" copiedLabel="Copied" />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                  })
                ) : (
                  <p className="italic text-gray-500 text-center">
                    No contributed links yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          {warningConfig && (
            <div
              className={`mt-5 text-xs rounded-md px-4 py-2 border text-center mx-auto w-fit transition-colors duration-300 ${warningConfig.tone === "positive"
                ? "text-green-700 bg-green-50 border-green-200"
                : warningConfig.tone === "neutral"
                  ? "text-gray-700 bg-gray-50 border-gray-200"
                  : warningConfig.tone === "yellow"
                    ? "text-yellow-900 bg-yellow-50 border-yellow-200"
                    : "text-red-600 bg-red-50 border-red-200"
                }`}
            >
              <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
                <span>{warningConfig.summary}</span>
                <button
                  type="button"
                  onClick={() => setShowDetail(!showDetail)}
                  className={`ml-1 whitespace-nowrap hover:underline text-xs font-semibold ${warningConfig.tone === "positive"
                    ? "text-green-700"
                    : warningConfig.tone === "neutral"
                      ? "text-gray-700"
                      : warningConfig.tone === "yellow"
                        ? "text-yellow-900"
                        : "text-red-600"
                    }`}
                >
                  <span className="font-semibold">
                    {showDetail ? "Hide" : (warningConfig.toggleLabel || "Warnings")}
                  </span>{" "}
                  <span aria-hidden="true">{showDetail ? "▲" : "▼"}</span>
                </button>
              </div>

              {showDetail && (
                <div className="mt-1 text-xs space-y-1">
                  {warningConfig.details.map((line, index) => (
                    <div key={`${warningConfig.tone}-${index}`}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BACK SIDE (auto-expand editable) */}
        <div
          className={`absolute inset-0 rotate-y-180 backface-hidden top-0 left-0 w-full ${showBack ? "relative h-auto" : ""
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
              <span>↺</span> {/* â®Œ left arrow, opposite of â®Ž */}


            </button>
          </div>


          <ProfileEditor profile={profile} links={linksArray} />
        </div>


      </div>

      <RedirectModal isOpen={authRedirectOpen} label={authRedirectLabel} />
      <AuthExplainerModal
        isOpen={authInfoOpen && !!authLink}
        canAuthenticate={canAuthenticateLinks}
        authPending={authPending}
        authRedirectOpen={authRedirectOpen}
        providerLabel={selectedAuthProvider?.label}
        onClose={() => {
          setAuthInfoOpen(false);
          setAuthLink(null);
        }}
        onAuthenticate={handleAuthenticateLink}
      />

      <style>{`
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
@keyframes link-tray-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.link-tray-shimmer {
  background: linear-gradient(90deg, rgba(243,244,246,0.95) 0%, rgba(59,130,246,0.18) 35%, rgba(249,115,22,0.2) 50%, rgba(34,197,94,0.18) 65%, rgba(243,244,246,0.95) 100%);
  background-size: 200% 100%;
  animation: link-tray-shimmer 1.2s ease-in-out infinite;
}
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











