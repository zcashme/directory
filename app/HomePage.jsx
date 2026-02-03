"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import zcashMeLogo from "@/ui/assets/icons/zcashme-header-left-bw.svg";
import AddUserForm from "@/ui/signup/AddUserForm";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";
import useProfiles from "@/lib/directory/useProfiles";
import { buildSlug } from "@/lib/profile/normalizeSlugs";

// ── Animated pattern components ──────────────────────────────────────

function AnimatedLines({ isHovering }) {
  return (
    <div className="absolute top-4 left-4 right-4 h-28 overflow-hidden">
      <div className="relative w-full h-full flex items-end justify-around px-1">
        {[...Array(16)].map((_, i) => {
          const baseHeight = 30 + Math.sin(i * 0.8) * 20;
          const hoverHeight = 60 + Math.sin(i * 0.5) * 25;
          return (
            <div
              key={i}
              className="w-1.5 rounded-full bg-gray-400/40"
              style={{
                height: isHovering ? `${hoverHeight}%` : `${baseHeight}%`,
                transition: `height ${0.3 + i * 0.02}s ease-out, opacity 0.3s ease-out`,
                opacity: isHovering ? 0.6 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function AnimatedDots({ isHovering }) {
  return (
    <div className="absolute top-4 left-4 right-4 h-28 overflow-hidden">
      <div className="relative w-full h-full flex flex-wrap gap-2 p-2">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: isHovering ? `${6 + (i % 4) * 2}px` : "6px",
              height: isHovering ? `${6 + (i % 4) * 2}px` : "6px",
              backgroundColor: `rgba(34,197,94,${isHovering ? 0.4 + (i % 5) * 0.1 : 0.3})`,
              transition: `all 0.3s ease-out ${i * 0.015}s`,
              transform: isHovering ? `translateY(${(i % 3 - 1) * 3}px)` : "translateY(0)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── FannedCard ───────────────────────────────────────────────────────

function FannedCard({
  profile,
  rotation,
  offset,
  verticalOffset = 0,
  zIndex,
  onClick,
  patternType,
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

  const patternActive = isHovering || isActive || isSpotlit;
  const Pattern = patternType === "dots" ? AnimatedDots : AnimatedLines;

  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;

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
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
          <div
            className={`w-16 h-16 rounded-full overflow-hidden bg-gray-100 shadow-lg ${isVerified ? "ring-3 ring-green-500" : "ring-3 ring-green-400"}`}
            style={{ transform: isActive ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}
          >
            {profile.profile_image_url ? (
              <img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-700 text-lg font-medium">
                {profile.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        <div
          className={`bg-white w-[160px] h-[240px] rounded-2xl border-2 border-green-400 p-3 pt-12 shadow-xl text-center flex flex-col relative ${isActive ? `card-shimmer ${shimmerSpeed}` : ""}`}
          style={{
            transform: isActive ? "scale(1)" : "scale(0.98)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isActive
              ? "0 25px 50px -12px rgba(34, 197, 94, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2)"
              : "0 5px 15px -5px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Pattern isHovering={patternActive} />
          <div className="flex items-center justify-center gap-1 mb-0.5 relative z-10">
            <span className="font-bold text-xs text-gray-900 truncate max-w-[100px]">
              {profile.display_name || profile.name}
            </span>
            {isVerified && (
              <span className="w-3.5 h-3.5 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-[9px] text-gray-600 mb-1.5 relative z-10">@{profile.name}</p>
          <div className="mt-auto pt-1 relative z-10">
            <span className="text-[7px] text-green-600 font-medium uppercase tracking-wider">Tap to view →</span>
          </div>
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
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
        <div
          className={`w-20 h-20 rounded-full overflow-hidden bg-gray-100 shadow-lg ${isVerified ? "ring-4 ring-green-500" : "ring-4 ring-green-400"}`}
          style={{ transform: isHighlighted ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}
        >
          {profile.profile_image_url ? (
            <img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700 text-xl font-medium">
              {profile.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      <div
        className={`bg-white w-[180px] h-[280px] rounded-2xl border-2 border-green-400 p-4 pt-14 text-center shadow-2xl flex flex-col relative ${isSpotlit && !isHovering ? `card-shimmer ${shimmerSpeed}` : ""}`}
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
        <Pattern isHovering={patternActive} />
        <div className="flex items-center justify-center gap-1 mb-0.5 relative z-10">
          <span className="font-bold text-sm text-gray-900 truncate max-w-[120px]">
            {profile.display_name || profile.name}
          </span>
          {isVerified && (
            <span className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-600 mb-2 relative z-10">@{profile.name}</p>
        <div className="mt-auto pt-2 relative z-10">
          <span className="text-[8px] text-green-600 font-medium uppercase tracking-wider">View Profile →</span>
        </div>
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
    }, 3500);
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

  const patternTypes = ["lines", "dots"];

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
          const patternType = patternTypes[index % patternTypes.length];
          const stackIndex = getStackIndex(index);
          const isActive = isMobile && index === activeCardIndex;
          const isSpotlit = !isMobile && index === activeCardIndex;
          const desktopPos = getDesktopPosition(index);
          return (
            <FannedCard
              key={profile.id ?? profile.address}
              profile={profile}
              patternType={patternType}
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

export default function HomePage() {
  const router = useRouter();
  const { profiles } = useProfiles(null, true);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [search, setSearch] = useState("");
  const [suppressDropdown, setSuppressDropdown] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Get featured profiles (randomly selected)
  const featuredProfiles = useMemo(() => {
    const featured = profiles.filter((p) => p.featured);
    const source = featured.length > 0 ? featured : profiles;

    if (source.length === 0) return [];

    // Create a shuffled copy and take up to 6
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(6, shuffled.length));
  }, [profiles]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-8">
            <Image
              src={zcashMeLogo}
              alt="Zcash.me"
              className="h-10 w-auto"
              width={150}
              height={40}
            />
            <button
              onClick={() => setIsJoinOpen(true)}
              className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold
                shadow-md transition-all duration-300 animate-joinPulse
                hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
            >
              Join
            </button>
          </div>
        </div>

        {/* Featured Profiles Section */}
        {featuredProfiles.length > 0 && (
          <div className="max-w-7xl mx-auto mb-20 md:mb-32 px-4">
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
                        const query = search.trim();
                        if (query) {
                          // Find exact match or first match
                          const exactMatch = profiles.find(
                            (p) => p.name?.toLowerCase() === query.toLowerCase() ||
                                   p.display_name?.toLowerCase() === query.toLowerCase()
                          );

                          if (exactMatch) {
                            const slug = buildSlug(exactMatch);
                            if (slug) {
                              window.location.href = `/${slug}`;
                            }
                          } else {
                            // Find first partial match
                            const firstMatch = profiles.find(
                              (p) => p.name?.toLowerCase().includes(query.toLowerCase()) ||
                                     p.display_name?.toLowerCase().includes(query.toLowerCase())
                            );

                            if (firstMatch) {
                              const slug = buildSlug(firstMatch);
                              if (slug) {
                                window.location.href = `/${slug}`;
                              }
                            }
                          }
                          setSuppressDropdown(true);
                        }
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
                      profiles={profiles}
                      placeholder="search"
                    />
                  </div>
                )}
              </div>
          </motion.div>
        </div>

        {/* How it Works Section */}
        <div className="max-w-lg mx-auto mb-20 md:mb-32 px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-3xl font-black text-gray-900 mb-12"
          >
            How it works
          </motion.h2>
          <div className="flex gap-4 md:gap-6">
            {[
              { number: "1", title: "Claim your username", description: "Choose a unique username and create your profile" },
              { number: "2", title: "Link your address", description: "Connect your Zcash address to receive payments" },
              { number: "3", title: "Receive payments", description: "Start receiving Zcash payments instantly and securely" },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center flex-1 min-w-0"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <span className="text-xl md:text-2xl font-black text-green-700">{step.number}</span>
                </div>
                <h3 className="text-xs md:text-base font-semibold text-gray-900">{step.title}</h3>
              </motion.div>
            ))}
          </div>
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
