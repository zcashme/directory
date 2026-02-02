"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { buildSlug } from "@/lib/profile/normalizeSlugs";
import "./landing.css";

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
              className="w-1.5 rounded-full bg-white/40"
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

function AnimatedGrid({ isHovering }) {
  return (
    <div className="absolute top-4 left-4 right-4 h-28 overflow-hidden">
      <div
        className="grid grid-cols-8 grid-rows-6 gap-1 h-full"
        style={{
          transition: "transform 0.5s ease-out",
          transform: isHovering ? "scale(1.1)" : "scale(1)",
        }}
      >
        {[...Array(48)].map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              backgroundColor: `rgba(0,0,0,${isHovering ? 0.1 + Math.random() * 0.3 : 0.1 + (i % 8) * 0.05})`,
              transition: `background-color ${0.2 + (i % 5) * 0.1}s ease-out`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AnimatedWaves({ isHovering }) {
  return (
    <div className="absolute top-4 left-4 right-4 h-28 overflow-hidden">
      <svg viewBox="0 0 100 80" className="w-full h-full">
        {[...Array(14)].map((_, i) => (
          <path
            key={i}
            d={
              isHovering
                ? `M0 ${5 + i * 6} Q25 ${i % 2 === 0 ? -5 : 15} 50 ${5 + i * 6} T100 ${5 + i * 6}`
                : `M0 ${5 + i * 6} Q25 ${5 + i * 6} 50 ${5 + i * 6} T100 ${5 + i * 6}`
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-white/40"
            style={{ transition: `d 0.4s ease-out ${i * 0.03}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

function AnimatedBlocks({ isHovering }) {
  return (
    <div className="absolute top-4 left-4 right-4 h-28 overflow-hidden">
      <div className="relative w-full h-full">
        {[...Array(6)].map((_, row) => (
          <div
            key={row}
            className="flex gap-0.5 mb-0.5"
            style={{
              transform: isHovering ? `translateX(${row % 2 === 0 ? 4 : -4}px)` : "translateX(0)",
              transition: `transform 0.4s ease-out ${row * 0.05}s`,
            }}
          >
            {[...Array(16)].map((_, col) => (
              <div
                key={col}
                className="w-2 h-3 rounded-sm"
                style={{
                  backgroundColor: isHovering
                    ? `rgba(0,80,60,${0.3 + Math.random() * 0.4})`
                    : `rgba(0,80,60,${(col + row) % 3 === 0 ? 0.5 : 0.2})`,
                  transition: `background-color ${0.2 + Math.random() * 0.3}s ease-out`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedCircles({ isHovering }) {
  return (
    <div className="absolute top-4 left-4 right-4 h-28 overflow-hidden">
      <svg viewBox="0 0 100 80" className="w-full h-full">
        {[...Array(12)].map((_, i) => {
          const cx = 10 + (i % 4) * 28;
          const cy = 15 + Math.floor(i / 4) * 25;
          const baseRadius = 8 + (i % 3) * 2;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={isHovering ? baseRadius + 3 : baseRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-white/40"
              style={{
                transition: `r 0.3s ease-out ${i * 0.04}s, opacity 0.3s ease-out`,
                opacity: isHovering ? 0.7 : 0.4,
              }}
            />
          );
        })}
      </svg>
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
              backgroundColor: `rgba(80,20,60,${isHovering ? 0.4 + (i % 5) * 0.1 : 0.3})`,
              transition: `all 0.3s ease-out ${i * 0.015}s`,
              transform: isHovering ? `translateY(${(i % 3 - 1) * 3}px)` : "translateY(0)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── BorderBeam (inlined) ─────────────────────────────────────────────

function BorderBeam({
  duration = 6,
  lightColor = "#f5c542",
  borderWidth = 2,
  beamSize = 80,
}) {
  const containerRef = useRef(null);
  const pathRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, [dimensions]);

  const { width, height } = dimensions;
  const radius = height / 2;
  const pillPath =
    width && height
      ? `M ${radius},0 L ${width - radius},0 A ${radius},${radius} 0 0 1 ${width},${radius} A ${radius},${radius} 0 0 1 ${width - radius},${height} L ${radius},${height} A ${radius},${radius} 0 0 1 0,${radius} A ${radius},${radius} 0 0 1 ${radius},0`
      : "";
  const dashLength = beamSize;
  const gapLength = pathLength - dashLength;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 rounded-[inherit] pointer-events-none"
      style={{ overflow: "visible" }}
    >
      <svg
        className="absolute w-full h-full"
        style={{ overflow: "visible", left: 0, top: 0 }}
        viewBox={width && height ? `0 0 ${width} ${height}` : undefined}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={pillPath} fill="none" stroke={`${lightColor}30`} strokeWidth={borderWidth} />
        <path ref={pathRef} d={pillPath} fill="none" stroke="transparent" strokeWidth={0} />
        {pathLength > 0 && (
          <motion.path
            d={pillPath}
            fill="none"
            stroke={lightColor}
            strokeWidth={borderWidth + 1}
            strokeLinecap="round"
            filter="url(#beam-glow)"
            strokeDasharray={`${dashLength} ${gapLength}`}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -pathLength }}
            transition={{ duration, repeat: Infinity, ease: "linear" }}
          />
        )}
      </svg>
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
  const renderPattern = () => {
    switch (patternType) {
      case "lines": return <AnimatedLines isHovering={patternActive} />;
      case "grid": return <AnimatedGrid isHovering={patternActive} />;
      case "waves": return <AnimatedWaves isHovering={patternActive} />;
      case "blocks": return <AnimatedBlocks isHovering={patternActive} />;
      case "circles": return <AnimatedCircles isHovering={patternActive} />;
      case "dots": return <AnimatedDots isHovering={patternActive} />;
      default: return <AnimatedLines isHovering={patternActive} />;
    }
  };

  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;
  const mobileTotalLinks = profile.total_links ?? (Array.isArray(profile.links) ? profile.links.length : 0);

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
            className={`w-16 h-16 rounded-full overflow-hidden bg-[#1a1a1a] shadow-lg ${isVerified ? "ring-3 ring-[#22c55e]" : "ring-3 ring-[#f5c542]"}`}
            style={{ transform: isActive ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}
          >
            {profile.profile_image_url ? (
              <img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#faf6ed] text-lg font-medium">
                {profile.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        </div>

        <div
          className={`bg-[#faf6ed] w-[160px] h-[240px] rounded-2xl border-2 border-[#f5c542] p-3 pt-12 shadow-xl text-center flex flex-col ${isActive ? `card-shimmer ${shimmerSpeed}` : ""}`}
          style={{
            transform: isActive ? "scale(1)" : "scale(0.98)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isActive
              ? "0 25px 50px -12px rgba(245, 197, 66, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2)"
              : "0 5px 15px -5px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span className="font-bold text-xs text-[#1a1a1a] truncate max-w-[100px]">
              {profile.display_name || profile.name}
            </span>
            {isVerified && (
              <span className="w-3.5 h-3.5 bg-[#22c55e] rounded-full flex items-center justify-center shrink-0">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-[9px] text-[#1a1a1a]/60 mb-1.5">@{profile.name}</p>
          <p className="text-[8px] text-[#1a1a1a]/70 mb-1.5 line-clamp-2 leading-relaxed px-1 min-h-[24px]">
            {profile.bio || <span className="invisible">Bio placeholder</span>}
          </p>
          {profile.address && (
            <div className="flex justify-center mb-1.5">
              <div className="flex items-center gap-1.5 bg-white border border-[#e5e5e5] rounded-lg px-2 py-1">
                <span className="font-mono text-[7px] text-[#1a1a1a] leading-none">
                  {profile.address.slice(0, 4)}...{profile.address.slice(-4)}
                </span>
              </div>
            </div>
          )}
          {mobileTotalLinks > 0 && (
            <div className="mt-auto w-full">
              <div className="bg-white/80 rounded border border-[#e5e5e5] px-1 py-0.5">
                <div className="flex flex-col gap-0.5">
                  {(profile.links || []).slice(0, 2).map((link, i) => {
                    let faviconUrl = "";
                    try { faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(link.url || "").hostname}&sz=32`; } catch { faviconUrl = ""; }
                    const iconSrc = link.icon?.src || link.icon || faviconUrl;
                    return (
                      <div key={i} className="flex items-center gap-1 min-w-0">
                        {iconSrc && <img src={iconSrc} alt="" className="w-2.5 h-2.5 rounded-sm object-contain shrink-0" onError={(e) => { e.target.style.display = "none"; }} />}
                        <span className="text-[7px] text-[#1a1a1a]/70 truncate">
                          {link.label || link.url?.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "Link"}
                        </span>
                      </div>
                    );
                  })}
                  {mobileTotalLinks > 2 && <span className="text-[6px] text-[#1a1a1a]/40 text-center">+{mobileTotalLinks - 2} more</span>}
                </div>
              </div>
            </div>
          )}
          {profile.nearest_city && (
            <div className="mt-1 flex items-center justify-center gap-0.5 text-[7px] text-[#1a1a1a]/50">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="truncate max-w-[80px]">{profile.nearest_city}</span>
            </div>
          )}
          <div className="mt-auto pt-1">
            <span className="text-[7px] text-[#f5c542] font-medium uppercase tracking-wider">Tap to view →</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop fanned layout ──
  const isHighlighted = isHovering || isSpotlit;
  const totalLinks = profile.total_links ?? (Array.isArray(profile.links) ? profile.links.length : 0);

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
          className={`w-20 h-20 rounded-full overflow-hidden bg-[#1a1a1a] shadow-lg ${isVerified ? "ring-4 ring-[#22c55e]" : "ring-4 ring-[#f5c542]"}`}
          style={{ transform: isHighlighted ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}
        >
          {profile.profile_image_url ? (
            <img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#faf6ed] text-xl font-medium">
              {profile.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      <div
        className={`bg-[#faf6ed] w-[180px] h-[280px] rounded-2xl border-2 border-[#f5c542] p-4 pt-14 text-center shadow-2xl flex flex-col ${isSpotlit && !isHovering ? `card-shimmer ${shimmerSpeed}` : ""}`}
        style={{
          transform: isHovering
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.08)`
            : isSpotlit
              ? "rotateX(0) rotateY(0) scale(1.05)"
              : "rotateX(0) rotateY(0) scale(1)",
          transformStyle: "preserve-3d",
          transition: "transform 0.2s ease-out, box-shadow 0.3s ease-out",
          boxShadow: isHovering
            ? "0 35px 60px -15px rgba(245, 197, 66, 0.4)"
            : isSpotlit
              ? "0 25px 50px -12px rgba(245, 197, 66, 0.3), 0 20px 40px -10px rgba(0, 0, 0, 0.3)"
              : "0 15px 35px -10px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span className="font-bold text-sm text-[#1a1a1a] truncate max-w-[120px]">
            {profile.display_name || profile.name}
          </span>
          {isVerified && (
            <span className="w-4 h-4 bg-[#22c55e] rounded-full flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#1a1a1a]/60 mb-2">@{profile.name}</p>
        <p className="text-[9px] text-[#1a1a1a]/70 mb-2 line-clamp-2 leading-relaxed px-1 min-h-[28px]">
          {profile.bio || <span className="invisible">Bio placeholder</span>}
        </p>
        {profile.address && (
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-lg px-2.5 py-1">
              <span className="font-mono text-[8px] text-[#1a1a1a] leading-none">
                {profile.address.slice(0, 4)}...{profile.address.slice(-4)}
              </span>
            </div>
          </div>
        )}
        {totalLinks > 0 && (
          <div className="mt-auto w-full">
            <div className="bg-white/80 rounded-lg border border-[#e5e5e5] px-1.5 py-1">
              <div className="flex flex-col gap-0.5">
                {(profile.links || []).slice(0, 3).map((link, i) => {
                  let faviconUrl = "";
                  try { faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(link.url || "").hostname}&sz=32`; } catch { faviconUrl = ""; }
                  const iconSrc = link.icon?.src || link.icon || faviconUrl;
                  return (
                    <div key={i} className="flex items-center gap-1 min-w-0">
                      {iconSrc && <img src={iconSrc} alt="" className="w-3 h-3 rounded-sm object-contain shrink-0" onError={(e) => { e.target.style.display = "none"; }} />}
                      <span className="text-[8px] text-[#1a1a1a]/70 truncate">
                        {link.label || link.url?.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] || "Link"}
                      </span>
                    </div>
                  );
                })}
                {totalLinks > 3 && <span className="text-[7px] text-[#1a1a1a]/40 text-center">+{totalLinks - 3} more</span>}
              </div>
            </div>
          </div>
        )}
        {profile.nearest_city && (
          <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-[#1a1a1a]/50">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="truncate max-w-[100px]">{profile.nearest_city}</span>
          </div>
        )}
        <div className="mt-auto pt-2">
          <span className="text-[8px] text-[#f5c542] font-medium uppercase tracking-wider">View Profile →</span>
        </div>
      </div>
    </div>
  );
}

// ── FeaturedCardsSection ─────────────────────────────────────────────

function FeaturedCardsSection({ featuredProfiles, onCardClick }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimeout = useRef(null);

  const reorderedProfiles = useMemo(() => {
    const frankIdx = featuredProfiles.findIndex(
      (p) => p.name?.toLowerCase() === "frank" || p.display_name?.toLowerCase() === "frank"
    );
    if (frankIdx < 0) return featuredProfiles;
    const centerIdx = Math.floor(featuredProfiles.length / 2);
    if (frankIdx === centerIdx) return featuredProfiles;
    const reordered = [...featuredProfiles];
    const frank = reordered.splice(frankIdx, 1)[0];
    reordered.splice(centerIdx, 0, frank);
    return reordered;
  }, [featuredProfiles]);

  const centerIndex = Math.floor(reorderedProfiles.length / 2);
  const [activeCardIndex, setActiveCardIndex] = useState(centerIndex);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    return () => { if (interactionTimeout.current) clearTimeout(interactionTimeout.current); };
  }, []);

  useEffect(() => {
    if (reorderedProfiles.length <= 1 || isInteracting) return;
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % reorderedProfiles.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [reorderedProfiles.length, isInteracting]);

  const handleHoverStart = () => {
    setIsInteracting(true);
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
  };
  const handleHoverEnd = () => {
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    interactionTimeout.current = setTimeout(() => setIsInteracting(false), 3000);
  };

  const handleCardClick = (index, profile) => {
    if (isMobile) {
      setActiveCardIndex(index);
    } else {
      if (index === activeCardIndex) {
        onCardClick(profile);
      } else {
        setActiveCardIndex(index);
        setIsInteracting(true);
        if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
        interactionTimeout.current = setTimeout(() => setIsInteracting(false), 5000);
      }
    }
  };

  const patternTypes = ["lines", "grid", "waves", "blocks", "circles", "dots"];
  const shimmerSpeeds = ["", "card-shimmer-fast", "card-shimmer-slow", "", "card-shimmer-fast", "card-shimmer-slow"];

  const getLayoutConfig = (count) => {
    if (count <= 1) return { rotations: [0], offsets: [0], verticalOffsets: [0], zIndexes: [1] };
    if (count === 2) return { rotations: [-10, 10], offsets: [-100, 100], verticalOffsets: [20, 20], zIndexes: [1, 2] };
    if (count === 3) return { rotations: [-12, 0, 12], offsets: [-130, 0, 130], verticalOffsets: [35, 0, 35], zIndexes: [1, 3, 2] };
    if (count === 4) return { rotations: [-14, -5, 5, 14], offsets: [-150, -50, 50, 150], verticalOffsets: [45, 15, 15, 45], zIndexes: [1, 2, 3, 2] };
    if (count === 5) return { rotations: [-15, -8, 0, 8, 15], offsets: [-170, -85, 0, 85, 170], verticalOffsets: [55, 25, 0, 25, 55], zIndexes: [1, 2, 3, 3, 2] };
    return { rotations: [-16, -10, -4, 4, 10, 16], offsets: [-190, -114, -38, 38, 114, 190], verticalOffsets: [65, 35, 10, 10, 35, 65], zIndexes: [1, 2, 3, 4, 3, 2] };
  };

  const baseLayout = getLayoutConfig(reorderedProfiles.length);

  const getDesktopPosition = (index) => {
    const count = reorderedProfiles.length;
    const cIdx = Math.floor(count / 2);
    const relativePos = index - activeCardIndex;
    const visualIdx = ((cIdx + relativePos) % count + count) % count;
    return {
      rotation: baseLayout.rotations[visualIdx] || 0,
      offset: baseLayout.offsets[visualIdx] || 0,
      verticalOffset: baseLayout.verticalOffsets[visualIdx] || 0,
      zIndex: baseLayout.zIndexes[visualIdx] || 1,
    };
  };

  const getStackIndex = (index) => {
    if (!isMobile) return index;
    return (index - activeCardIndex + reorderedProfiles.length) % reorderedProfiles.length;
  };

  if (reorderedProfiles.length === 0) return null;

  return (
    <div className="mb-16" style={{ overflowX: "clip" }}>
      <h2 className="text-center text-sm uppercase tracking-widest text-[#faf6ed]/40 mb-8 md:mb-12">Featured Profiles</h2>
      <div className="relative flex justify-center items-start h-[340px] md:h-[420px] pt-12 md:pt-16" style={{ overflowX: "clip" }}>
        {reorderedProfiles.map((profile, index) => {
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
              shimmerSpeed={shimmerSpeeds[index % shimmerSpeeds.length]}
              onInteractionStart={handleHoverStart}
              onInteractionEnd={handleHoverEnd}
              onClick={() => handleCardClick(index, profile)}
            />
          );
        })}
      </div>
      {isMobile && reorderedProfiles.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {reorderedProfiles.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveCardIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeCardIndex ? "bg-[#f5c542] w-6" : "bg-[#faf6ed]/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main LandingPage component ───────────────────────────────────────

export default function LandingPage({ profiles = [] }) {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const stickyTriggerRef = useRef(null);

  const [search, setSearch] = useState("");
  const [isSearchBarFixed, setIsSearchBarFixed] = useState(false);
  const [filters, setFilters] = useState({ verified: false, ranked: false, featured: true });

  // Sticky detection
  useEffect(() => {
    if (!stickyTriggerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsSearchBarFixed(!entry.isIntersecting);
    }, { threshold: 0 });
    observer.observe(stickyTriggerRef.current);
    return () => observer.disconnect();
  }, []);

  // Featured profiles (for the fanned card section)
  const featuredProfiles = useMemo(() => {
    const featured = profiles.filter((p) => p.featured);
    return featured.length >= 6 ? featured.slice(0, 6) : profiles.slice(0, 6);
  }, [profiles]);

  // Filtered + grouped directory
  const { grouped, letters } = useMemo(() => {
    let s = [...profiles].filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));

    if (filters.verified) s = s.filter((p) => p.address_verified || (p.verified_links_count ?? 0) > 0);
    if (filters.ranked) {
      s = s.filter((p) => {
        const a = Number(p.rank_alltime) || 0;
        const w = Number(p.rank_weekly) || 0;
        const m = Number(p.rank_monthly) || 0;
        return (a > 0 && a <= 10) || (w > 0 && w <= 10) || (m > 0 && m <= 10);
      });
    }
    if (filters.featured) s = s.filter((p) => Boolean(p.featured));

    s.sort((a, b) => a.name.localeCompare(b.name));

    const g = s.reduce((acc, p) => {
      const first = p.name?.[0]?.toUpperCase() || "#";
      (acc[first] ||= []).push(p);
      return acc;
    }, {});
    return { grouped: g, letters: Object.keys(g).sort() };
  }, [profiles, search, filters]);

  const navigateToProfile = (profile) => {
    const slug = buildSlug(profile);
    if (slug) router.push(`/${slug}`);
  };

  const toggleFilter = (key) => {
    setFilters((prev) => {
      const next = { verified: false, ranked: false, featured: false };
      if (prev[key]) return next;
      next[key] = true;
      return next;
    });
  };

  const exactMatch = search ? profiles.find((p) => p.name?.toLowerCase() === search.toLowerCase()) : null;
  const isAvailable = search && !exactMatch;
  const isTaken = search && exactMatch;

  return (
    <div className="min-h-screen bg-[#0d0d0d] w-full" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Brand */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8 md:pt-20 pb-6 md:pb-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-6xl font-light text-[#faf6ed] tracking-tight mb-1 md:mb-4">
            Zcash<span className="text-[#f5c542]">.me</span>
          </h1>
          <p className="text-sm md:text-lg text-[#faf6ed]/60 font-light max-w-md mx-auto px-4">
            The simplest way to receive Zcash payments
          </p>
        </div>
      </div>

      {/* Sticky trigger */}
      <div ref={stickyTriggerRef} className="h-0 w-full" aria-hidden="true" />

      {/* Search bar */}
      <div
        className={`sticky top-0 z-[100] py-3 md:py-4 px-4 md:px-0 transition-all duration-500 ease-out ${
          isSearchBarFixed
            ? "bg-[#0d0d0d]/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-[#faf6ed]/10"
            : "bg-[#0d0d0d] shadow-none border-b border-transparent"
        }`}
      >
        <div className="w-full max-w-sm md:max-w-lg mx-auto">
          <div className="relative">
            <div className="relative flex items-center bg-[#faf6ed] rounded-full px-4 md:px-5 py-2.5 md:py-3">
              <BorderBeam lightColor={isAvailable ? "#22c55e" : "#f5c542"} duration={6} borderWidth={2} />
              <span className="text-[#1a1a1a]/40 font-medium text-sm md:text-base shrink-0">zcash.me/</span>
              <div className="flex-1 min-w-0">
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setFilters({ verified: false, ranked: false, featured: false });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && search) {
                      if (exactMatch) navigateToProfile(exactMatch);
                      else alert("Claim flow coming soon! Visit the main site to claim your username.");
                    }
                  }}
                  placeholder="search or claim username"
                  className="w-full px-1 py-0.5 text-sm md:text-base bg-transparent text-[#1a1a1a] placeholder-[#1a1a1a]/30 outline-none"
                />
              </div>
              {isTaken ? (
                <button
                  onClick={() => navigateToProfile(exactMatch)}
                  className="ml-2 md:ml-3 p-2 md:px-5 md:py-2 bg-[#22c55e] text-white rounded-full text-xs md:text-sm font-medium hover:bg-[#16a34a] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="hidden md:inline">View</span>
                </button>
              ) : (
                <button
                  onClick={() => alert("Claim flow coming soon! Visit the main site to claim your username.")}
                  className={`ml-2 md:ml-3 p-2 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    isAvailable ? "bg-[#22c55e] text-white hover:bg-[#16a34a]" : "bg-[#1a1a1a] text-[#faf6ed] hover:bg-[#2a2a2a]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden md:inline">Claim</span>
                </button>
              )}
            </div>
          </div>

          {/* Status message */}
          {search && (
            <div className="text-center mt-3">
              {isTaken ? (
                <p className="text-sm text-[#faf6ed]/70 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                  <span><strong className="text-[#f5c542]">{exactMatch.display_name || exactMatch.name}</strong> already exists</span>
                  <span className="text-[#faf6ed]/40">•</span>
                  <button onClick={() => navigateToProfile(exactMatch)} className="text-[#22c55e] hover:underline font-medium">View profile →</button>
                </p>
              ) : (
                <p className="text-sm text-[#22c55e] flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <strong>zcash.me/{search}</strong> is available!
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-xs mx-auto border-t border-[#faf6ed]/10 mt-8 mb-8 md:mb-12" />

      {/* Featured cards fan */}
      <FeaturedCardsSection
        featuredProfiles={featuredProfiles}
        onCardClick={navigateToProfile}
      />

      {/* Divider */}
      <div className="max-w-xs mx-auto border-t border-[#faf6ed]/10 my-6 md:my-16" />

      {/* How it works */}
      <div className="max-w-2xl mx-auto text-center mb-6 md:mb-16 px-4">
        <h2 className="text-[10px] md:text-sm uppercase tracking-widest text-[#faf6ed]/40 mb-4 md:mb-8">How it works</h2>
        <div className="grid grid-cols-3 gap-3 md:gap-8">
          <div>
            <div className="text-lg md:text-2xl mb-1 md:mb-3 text-[#faf6ed]">1</div>
            <p className="text-[#faf6ed]/60 text-[9px] md:text-sm leading-tight">Claim your username</p>
          </div>
          <div>
            <div className="text-lg md:text-2xl mb-1 md:mb-3 text-[#faf6ed]">2</div>
            <p className="text-[#faf6ed]/60 text-[9px] md:text-sm leading-tight">Link your address</p>
          </div>
          <div>
            <div className="text-lg md:text-2xl mb-1 md:mb-3 text-[#faf6ed]">3</div>
            <p className="text-[#faf6ed]/60 text-[9px] md:text-sm leading-tight">Receive payments</p>
          </div>
        </div>
      </div>

      {/* Directory section */}
      <div id="directory-section" className="max-w-2xl mx-auto px-4 pb-24">
        <div className="max-w-xs mx-auto border-t border-[#faf6ed]/10 mb-8" />

        {/* Filter tags */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 mb-4 md:mb-6 scrollbar-hide">
          <div className="flex gap-1.5 md:gap-2 min-w-max md:flex-wrap md:justify-center">
            <button
              onClick={() => toggleFilter("featured")}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                filters.featured ? "bg-[#f5c542] text-[#1a1a1a]" : "bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10"
              }`}
            >
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Featured
            </button>
            <button
              onClick={() => toggleFilter("ranked")}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                filters.ranked ? "bg-[#f97316] text-white" : "bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10"
              }`}
            >
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Top Rank
            </button>
            <button
              onClick={() => toggleFilter("verified")}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                filters.verified ? "bg-[#22c55e] text-white" : "bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10"
              }`}
            >
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </button>
            <button
              onClick={() => setFilters({ verified: false, ranked: false, featured: false })}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                !filters.verified && !filters.ranked && !filters.featured
                  ? "bg-[#3b82f6] text-white"
                  : "bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10"
              }`}
            >
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              All
              <span className="bg-white/20 px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px]">{profiles.length}</span>
            </button>
          </div>
        </div>

        <h2 className="text-center text-[10px] md:text-sm uppercase tracking-widest text-[#faf6ed]/40 mb-4 md:mb-6">
          {search ? `Results for "${search}"` : filters.featured ? "Featured Profiles" : filters.ranked ? "Top Ranked" : filters.verified ? "Verified Profiles" : "All Profiles"}
        </h2>

        {/* Alphabetical directory */}
        <div className="flex flex-col gap-1.5 md:gap-3 max-w-[280px] md:max-w-md mx-auto">
          {letters.map((letter) => (
            <div key={letter} id={`letter-${letter}`}>
              <div className="sticky top-0 z-10 py-1.5 md:py-2 px-2 md:px-3 mb-1.5 md:mb-2 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-[#faf6ed]/10">
                <span className="text-[#f5c542] font-bold text-sm md:text-lg">{letter}</span>
                <span className="text-[#faf6ed]/40 text-[10px] md:text-sm ml-1.5 md:ml-2">({grouped[letter]?.length || 0})</span>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-3">
                {grouped[letter]?.map((profile) => (
                  <div
                    key={profile.id ?? profile.address}
                    onClick={() => navigateToProfile(profile)}
                    className="bg-[#faf6ed] rounded-lg md:rounded-2xl border border-[#f5c542]/50 p-2 md:p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-[#f5c542]/20 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className={`relative shrink-0 w-7 h-7 md:w-14 md:h-14 rounded-full ${profile.address_verified ? "ring-1 md:ring-2 ring-[#22c55e]" : "ring-1 md:ring-2 ring-[#f5c542]"} overflow-hidden bg-[#1a1a1a]`}>
                        {profile.profile_image_url ? (
                          <img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#faf6ed] text-[10px] md:text-xl font-medium">
                            {profile.name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col flex-grow min-w-0">
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="font-semibold text-xs md:text-lg text-[#1a1a1a] truncate">
                            {profile.display_name || profile.name}
                          </span>
                          {(profile.address_verified || (profile.verified_links_count ?? 0) > 0) && (
                            <span className="w-3 h-3 md:w-5 md:h-5 bg-[#22c55e] rounded-full flex items-center justify-center shrink-0">
                              <svg className="w-2 h-2 md:w-3 md:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] md:text-sm text-[#1a1a1a]/60">@{profile.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
