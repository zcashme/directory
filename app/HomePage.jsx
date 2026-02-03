"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import zcashMeLogo from "@/ui/assets/icons/zcashme-header-left-bw.svg";
import AddUserForm from "@/ui/signup/AddUserForm";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import { buildSlug } from "@/lib/profile/normalizeSlugs";


// ── FannedCard ───────────────────────────────────────────────────────

function FannedCard({
  profile,
  rotation,
  offset,
  verticalOffset = 0,
  zIndex,
  onClick,
  isMobile,
  isActive,
  stackIndex,
  isSpotlit,
  onInteractionStart,
  onInteractionEnd,
  shimmerSpeed = "",
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback(
    (e) => {
      if (!cardRef.current || isMobile) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      setTilt({ x: ((y - centerY) / centerY) * -10, y: ((x - centerX) / centerX) * 10 });
    },
    [isMobile]
  );

  const handleMouseEnter = () => {
    if (isMobile) return;
    setIsHovering(true);
    onInteractionStart?.();
  };
  const handleMouseLeave = () => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    onInteractionEnd?.();
  };

  // Keep computed values for future use (imports preserved)
  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;
  const mobileTotalLinks = profile.total_links ?? (Array.isArray(profile.links) ? profile.links.length : 0);
  const totalLinks = profile.total_links ?? (Array.isArray(profile.links) ? profile.links.length : 0);
  // Note: profile.profile_image_url, profile.display_name, profile.bio, profile.links, profile.nearest_city available but not rendered

  // ── Mobile stacked layout ──
  if (isMobile) {
    const stackOffset = isActive ? -16 : stackIndex * 8;
    const stackScale = isActive ? 1.05 : 1 - stackIndex * 0.03;
    const stackRotation = stackIndex === 0 ? 0 : (stackIndex % 2 === 0 ? 2 : -2) * (stackIndex * 0.5);

    return (
      <div
        ref={cardRef}
        onClick={onClick}
        className="absolute cursor-pointer left-1/2"
        style={{
          transform: `translateX(-50%) translateY(${stackOffset}px) scale(${stackScale}) rotate(${isActive ? 0 : stackRotation}deg)`,
          zIndex: isActive ? 50 : 20 - stackIndex,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease, z-index 0s",
          opacity: isActive ? 1 : Math.max(0.4, 1 - stackIndex * 0.15),
          transformOrigin: "center center",
        }}
      >
        {/* Profile Avatar */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
          <div
            className="rounded-full border border-black p-0.5 bg-white"
            style={{ transform: isActive ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}
          >
            <div className="[&>div]:!bg-transparent [&>div]:!border-0">
              <ProfileAvatar
                profile={profile}
                size={64}
                imageClassName="object-cover"
                className="shadow-lg"
                showFallbackIcon
              />
            </div>
          </div>
        </div>

        <div
          className={`bg-white w-[160px] h-[240px] rounded-2xl border border-black p-3 pt-12 shadow-xl text-center flex flex-col relative ${isActive ? `card-shimmer ${shimmerSpeed}` : ""}`}
          style={{
            transform: isActive ? "scale(1)" : "scale(0.98)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isActive
              ? "0 25px 50px -12px rgba(34, 197, 94, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2)"
              : "0 5px 15px -5px rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* Display Name */}
          <div className="mb-1 relative z-10">
            <span className="font-bold text-xs text-gray-900 truncate block text-center max-w-full px-6">
              {profile.display_name || profile.name}
            </span>
            {isVerified && (
              <span className="absolute top-0 right-2 scale-[0.5] origin-center">
                <VerifiedBadge verified={true} />
              </span>
            )}
          </div>
          {/* Username */}
          <p className="text-[9px] text-gray-600 mb-2 relative z-10">@{profile.name}</p>

          {/* Bio */}
          {profile.bio && profile.bio.trim() !== "" && (
            <p className="text-[8px] text-gray-700 mb-4 line-clamp-2 leading-relaxed px-1 min-h-[24px] relative z-10 break-words">
              {profile.bio}
            </p>
          )}

          {/* Address pill with icons */}
          {profile.address && (
            <div className="flex justify-center mb-4 relative z-10">
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                <span className="font-mono text-[7px] text-gray-700 leading-none">
                  {profile.address.slice(0, 4)}...{profile.address.slice(-4)}
                </span>
                {/* QR Code icon */}
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="QR Code"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="3" height="3" />
                    <rect x="18" y="14" width="3" height="3" />
                    <rect x="14" y="18" width="3" height="3" />
                    <rect x="18" y="18" width="3" height="3" />
                  </svg>
                </button>
                {/* Copy icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(profile.address);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copy address"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Desktop fanned layout ──
  const isHighlighted = isHovering || isSpotlit;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="absolute cursor-pointer"
      style={{
        transform: `translateX(${offset}px) translateY(${isHighlighted ? verticalOffset - 30 : verticalOffset}px) rotate(${isHighlighted ? 0 : rotation}deg) scale(${isHovering ? 1.05 : isHighlighted ? 1.02 : 1})`,
        zIndex: isHovering ? 100 : isSpotlit ? 50 : zIndex,
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s",
        perspective: "1000px",
      }}
    >
      {/* Profile Avatar */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
        <div
          className="rounded-full border border-black p-0.5 bg-white"
          style={{ transform: isHighlighted ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}
        >
          <div className="[&>div]:!bg-transparent [&>div]:!border-0">
            <ProfileAvatar
              profile={profile}
              size={80}
              imageClassName="object-cover"
              className="shadow-lg"
              showFallbackIcon
            />
          </div>
        </div>
      </div>

      <div
        className={`bg-white w-[180px] h-[280px] rounded-2xl border border-black p-4 pt-14 text-center shadow-2xl flex flex-col relative ${isSpotlit && !isHovering ? `card-shimmer ${shimmerSpeed}` : ""}`}
        style={{
          transform: isHovering
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.08)`
            : isSpotlit
              ? "rotateX(0) rotateY(0) scale(1.05)"
              : "rotateX(0) rotateY(0) scale(1)",
          transformStyle: "preserve-3d",
          transition: "transform 0.2s ease-out, box-shadow 0.3s ease-out",
          boxShadow: isHovering
            ? "0 35px 60px -15px rgba(34, 197, 94, 0.4)"
            : isSpotlit
              ? "0 25px 50px -12px rgba(34, 197, 94, 0.3), 0 20px 40px -10px rgba(0, 0, 0, 0.3)"
              : "0 15px 35px -10px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Display Name */}
        <div className="mb-1 relative z-10">
          <span className="font-bold text-sm text-gray-900 truncate block text-center max-w-full px-8">
            {profile.display_name || profile.name}
          </span>
          {isVerified && (
            <span className="absolute top-0 right-3 scale-[0.5] origin-center">
              <VerifiedBadge verified={true} />
            </span>
          )}
        </div>
        {/* Username */}
        <p className="text-[10px] text-gray-600 mb-2 relative z-10">@{profile.name}</p>

        {/* Bio */}
        {profile.bio && profile.bio.trim() !== "" && (
          <p className="text-[9px] text-gray-700 mb-4 line-clamp-2 leading-relaxed px-1 min-h-[28px] relative z-10 break-words">
            {profile.bio}
          </p>
        )}

        {/* Address pill with icons */}
        {profile.address && (
          <div className="flex justify-center mb-4 relative z-10">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
              <span className="font-mono text-[8px] text-gray-700 leading-none">
                {profile.address.slice(0, 4)}...{profile.address.slice(-4)}
              </span>
              {/* QR Code icon */}
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="QR Code"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="3" height="3" />
                  <rect x="18" y="14" width="3" height="3" />
                  <rect x="14" y="18" width="3" height="3" />
                  <rect x="18" y="18" width="3" height="3" />
                </svg>
              </button>
              {/* Copy icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(profile.address);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy address"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── FeaturedCardsSection ─────────────────────────────────────────────

function FeaturedCardsSection({ featuredProfiles, onCardClick }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const centerIndex = Math.floor(featuredProfiles.length / 2);
  const [activeCardIndex, setActiveCardIndex] = useState(centerIndex);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (featuredProfiles.length <= 1 || isInteracting) return;
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % featuredProfiles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [featuredProfiles.length, isInteracting]);

  const handleHoverStart = () => {
    setIsInteracting(true);
  };
  const handleHoverEnd = () => {
    setIsInteracting(false);
  };

  const handleCardClick = (index, profile) => {
    if (isMobile) {
      setActiveCardIndex(index);
    } else {
      if (index === activeCardIndex) {
        onCardClick(profile);
      } else {
        setActiveCardIndex(index);
      }
    }
  };

  const getDesktopPosition = (index) => {
    const count = featuredProfiles.length;
    const centerIdx = Math.floor(count / 2);
    const relativePos = index - activeCardIndex;
    const visualIdx = ((centerIdx + relativePos) % count + count) % count;
    const distanceFromCenter = Math.abs(visualIdx - centerIdx);
    const isLeft = visualIdx < centerIdx;

    return {
      rotation: distanceFromCenter === 0 ? 0 : (isLeft ? -12 : 12) + (distanceFromCenter - 1) * -2,
      offset: distanceFromCenter === 0 ? 0 : (isLeft ? -1 : 1) * (100 + distanceFromCenter * 40),
      verticalOffset: distanceFromCenter * 15,
      zIndex: count - distanceFromCenter,
    };
  };

  const getStackIndex = (index) => {
    if (!isMobile) return index;
    return (index - activeCardIndex + featuredProfiles.length) % featuredProfiles.length;
  };

  if (featuredProfiles.length === 0) return null;

  return (
    <div className="mb-16" style={{ overflowX: "clip" }}>
      <div className="relative flex justify-center items-start h-[340px] md:h-[420px] pt-12 md:pt-16" style={{ overflowX: "clip" }}>
        {featuredProfiles.map((profile, index) => {
          const stackIndex = getStackIndex(index);
          const isActive = isMobile && index === activeCardIndex;
          const isSpotlit = !isMobile && index === activeCardIndex;
          const desktopPos = getDesktopPosition(index);
          return (
            <FannedCard
              key={profile.id ?? profile.address}
              profile={profile}
              rotation={desktopPos.rotation}
              offset={desktopPos.offset}
              verticalOffset={desktopPos.verticalOffset}
              zIndex={desktopPos.zIndex}
              isMobile={isMobile}
              isActive={isActive}
              stackIndex={stackIndex}
              isSpotlit={isSpotlit}
              shimmerSpeed={isSpotlit ? "card-shimmer" : ""}
              onInteractionStart={handleHoverStart}
              onInteractionEnd={handleHoverEnd}
              onClick={() => handleCardClick(index, profile)}
            />
          );
        })}
      </div>
      {isMobile && featuredProfiles.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {featuredProfiles.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveCardIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeCardIndex ? "bg-green-600 w-6" : "bg-gray-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage({ initialFeaturedProfiles = [] }) {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [search, setSearch] = useState("");
  const [suppressDropdown, setSuppressDropdown] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Featured profiles come from server - no client fetch needed
  const featuredProfiles = initialFeaturedProfiles;

  // Track scroll position for dynamic spacing
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate spacing based on scroll (max spacing at top, closer when scrolled)
  const maxSpacing = 448; // max-w-md equivalent (28rem = 448px)
  const minSpacing = 96; // Minimum spacing (6rem = 96px)
  const scrollThreshold = 300; // Distance to scroll before reaching min spacing
  const spacing = Math.max(
    minSpacing,
    maxSpacing - Math.min(scrollY / scrollThreshold, 1) * (maxSpacing - minSpacing)
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-center mb-8">
            <Image
              src={zcashMeLogo}
              alt="Zcash.me"
              className="h-10 w-auto shrink-0"
              width={150}
              height={40}
            />
            <div
              className="transition-all duration-200 ease-out"
              style={{ width: `${spacing}px` }}
            />
            <button
              onClick={() => setIsJoinOpen(true)}
              className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold
                shadow-md transition-all duration-300 animate-joinPulse shrink-0
                hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
            >
              Join
            </button>
          </div>
        </div>

        {/* Featured Profiles Section */}
        {featuredProfiles.length > 0 && (
          <div className="max-w-7xl mx-auto mb-12 md:mb-16 px-4">
            <FeaturedCardsSection
              featuredProfiles={featuredProfiles}
              onCardClick={(profile) => {
                const slug = buildSlug(profile);
                if (slug) router.push(`/${slug}`);
              }}
            />
          </div>
        )}

        {/* Hero Section */}
        <div className="max-w-lg mx-auto px-4 mb-8">
          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative bg-white rounded-2xl shadow-xl border border-green-100 p-6"
          >
            {/* Search Bar */}
            <div className="w-full mx-auto relative">
                <div className="relative flex items-center bg-white rounded-full px-4 py-3 border border-gray-200 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/10 transition-all shadow-sm">
                  <span className="text-gray-400 font-medium text-sm mr-2">zcash.me/</span>
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSuppressDropdown(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Let the dropdown handle Enter key - it has the search results
                        setSuppressDropdown(true);
                      }
                    }}
                    placeholder="Search names"
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
                  />
                  <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Search Dropdown */}
                {search && !suppressDropdown && (
                  <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-2 z-50">
                    <ProfileSearchDropdown
                      listOnly
                      value={search}
                      onChange={(v) => {
                        if (typeof v === "object") {
                          window.lastSelectionWasExplicit = true;
                          const slug = buildSlug(v);
                          if (slug) {
                            window.location.href = `/${slug}`;
                          }
                        } else {
                          setSearch(v);
                        }
                      }}
                      placeholder="search"
                    />
                  </div>
                )}
              </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-center gap-6">
            <motion.a
              href="https://x.com/zcashme"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </motion.a>
            <motion.a
              href="https://discord.gg/zcashme"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.29-.444.67-.608 1.06a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.06.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </motion.a>
            <motion.a
              href="https://github.com/zcashme"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.464-1.178-1.132-1.49-1.132-1.49-.927-.634.07-.622.07-.622 1.025.072 1.564 1.032 1.564 1.032.91 1.56 2.384 1.088 2.96.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </motion.a>
          </div>
        </div>
      </footer>

      {/* Join Modal */}
      <AddUserForm
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={() => setIsJoinOpen(false)}
      />

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
