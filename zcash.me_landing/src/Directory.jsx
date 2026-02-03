"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Animated patterns for each card type
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
          transition: 'transform 0.5s ease-out',
          transform: isHovering ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {[...Array(48)].map((_, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              backgroundColor: `rgba(0,0,0,${isHovering ? 0.1 + (Math.random() * 0.3) : 0.1 + ((i % 8) * 0.05)})`,
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
            d={isHovering
              ? `M0 ${5 + i * 6} Q25 ${i % 2 === 0 ? -5 : 15} 50 ${5 + i * 6} T100 ${5 + i * 6}`
              : `M0 ${5 + i * 6} Q25 ${5 + i * 6} 50 ${5 + i * 6} T100 ${5 + i * 6}`
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-white/40"
            style={{
              transition: `d 0.4s ease-out ${i * 0.03}s`,
            }}
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
              transform: isHovering ? `translateX(${row % 2 === 0 ? 4 : -4}px)` : 'translateX(0)',
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
              width: isHovering ? `${6 + (i % 4) * 2}px` : '6px',
              height: isHovering ? `${6 + (i % 4) * 2}px` : '6px',
              backgroundColor: `rgba(80,20,60,${isHovering ? 0.4 + (i % 5) * 0.1 : 0.3})`,
              transition: `all 0.3s ease-out ${i * 0.015}s`,
              transform: isHovering ? `translateY(${(i % 3 - 1) * 3}px)` : 'translateY(0)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Fanned Parallax Card Component
function FannedCard({
  profile,
  cardColor,
  rotation,
  offset,
  verticalOffset = 0,
  zIndex,
  textColor,
  textColorMuted,
  onClick,
  patternType,
  isMobile,
  isActive,
  stackIndex,
  isSpotlit,
  onInteractionStart,
  onInteractionEnd,
  shimmerSpeed = '', // '', 'card-shimmer-fast', or 'card-shimmer-slow'
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current || isMobile) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = (y - centerY) / centerY * -10;
    const tiltY = (x - centerX) / centerX * 10;
    setTilt({ x: tiltX, y: tiltY });
  }, [isMobile]);

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

  // Render the appropriate pattern based on type
  // isActive for mobile, isSpotlit for desktop auto-spotlight
  const patternActive = isHovering || isActive || isSpotlit;
  const renderPattern = () => {
    switch (patternType) {
      case 'lines': return <AnimatedLines isHovering={patternActive} />;
      case 'grid': return <AnimatedGrid isHovering={patternActive} />;
      case 'waves': return <AnimatedWaves isHovering={patternActive} />;
      case 'blocks': return <AnimatedBlocks isHovering={patternActive} />;
      case 'circles': return <AnimatedCircles isHovering={patternActive} />;
      case 'dots': return <AnimatedDots isHovering={patternActive} />;
      default: return <AnimatedLines isHovering={patternActive} />;
    }
  };

  // Check verification status
  const isVerified = profile.address_verified || (profile.verified_links_count ?? 0) > 0;

  // Get links count for mobile
  const mobileTotalLinks = profile.total_links ?? (Array.isArray(profile.links) ? profile.links.length : 0);

  // Mobile stacked layout - ProfileCard style (tall rectangle)
  // Real-world card stack: cards behind are slightly lower and scaled down
  if (isMobile) {
    // Stack cards like a real deck - each card behind is offset down and slightly smaller
    // Active card pops up with negative offset for emphasis
    const stackOffset = isActive ? -16 : stackIndex * 8; // Active card pops up, others stack down
    const stackScale = isActive ? 1.05 : 1 - (stackIndex * 0.03); // Active card scales up
    const stackRotation = stackIndex === 0 ? 0 : (stackIndex % 2 === 0 ? 2 : -2) * (stackIndex * 0.5); // Subtle rotation

    return (
      <div
        ref={cardRef}
        onClick={onClick}
        className="absolute cursor-pointer left-1/2"
        style={{
          transform: `translateX(-50%) translateY(${stackOffset}px) scale(${stackScale}) rotate(${isActive ? 0 : stackRotation}deg)`,
          zIndex: isActive ? 50 : (20 - stackIndex),
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease, z-index 0s',
          opacity: isActive ? 1 : Math.max(0.4, 1 - (stackIndex * 0.15)),
          transformOrigin: 'center center',
        }}
      >
        {/* Avatar - positioned half outside */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
          <div className={`w-16 h-16 rounded-full overflow-hidden bg-[#1a1a1a] shadow-lg ${isVerified ? 'ring-3 ring-[#22c55e]' : 'ring-3 ring-[#f5c542]'}`}
            style={{
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.3s ease-out',
            }}
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
          className={`bg-[#faf6ed] w-[160px] h-[240px] rounded-2xl border-2 border-[#f5c542] p-3 pt-12 shadow-xl text-center flex flex-col ${isActive ? `card-shimmer ${shimmerSpeed}` : ''}`}
          style={{
            transform: isActive ? 'scale(1)' : 'scale(0.98)',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isActive
              ? '0 25px 50px -12px rgba(245, 197, 66, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2)'
              : '0 5px 15px -5px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Name with verified badge */}
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

          {/* Username */}
          <p className="text-[9px] text-[#1a1a1a]/60 mb-1.5">@{profile.name}</p>

          {/* Bio snippet - always reserve space */}
          <p className="text-[8px] text-[#1a1a1a]/70 mb-1.5 line-clamp-2 leading-relaxed px-1 min-h-[24px]">
            {profile.bio || <span className="invisible">Bio placeholder</span>}
          </p>

          {/* Address pill with icons inside */}
          {profile.address && (
            <div className="flex justify-center mb-1.5">
              <div className="flex items-center gap-1.5 bg-white border border-[#e5e5e5] rounded-lg px-2 py-1">
                <span className="font-mono text-[7px] text-[#1a1a1a] leading-none">
                  {profile.address.slice(0, 4)}...{profile.address.slice(-4)}
                </span>
                {/* QR Code icon */}
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
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
                  className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Links section - show icons + usernames */}
          {mobileTotalLinks > 0 && (
            <div className="mt-auto w-full">
              <div className="bg-white/80 rounded border border-[#e5e5e5] px-1 py-0.5">
                <div className="flex flex-col gap-0.5">
                  {(profile.links || []).slice(0, 2).map((link, i) => {
                    let faviconUrl = '';
                    try {
                      const domain = new URL(link.url || '').hostname;
                      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                    } catch { faviconUrl = ''; }
                    const iconSrc = link.icon?.src || link.icon || faviconUrl;
                    return (
                      <div key={i} className="flex items-center gap-1 min-w-0">
                        {iconSrc && (
                          <img
                            src={iconSrc}
                            alt=""
                            className="w-2.5 h-2.5 rounded-sm object-contain shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <span className="text-[7px] text-[#1a1a1a]/70 truncate">
                          {link.label || link.url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || 'Link'}
                        </span>
                      </div>
                    );
                  })}
                  {mobileTotalLinks > 2 && (
                    <span className="text-[6px] text-[#1a1a1a]/40 text-center">
                      +{mobileTotalLinks - 2} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* City/Location if available */}
          {profile.nearest_city && (
            <div className="mt-1 flex items-center justify-center gap-0.5 text-[7px] text-[#1a1a1a]/50">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="truncate max-w-[80px]">{profile.nearest_city}</span>
            </div>
          )}

          {/* View profile hint */}
          <div className="mt-auto pt-1">
            <span className="text-[7px] text-[#f5c542] font-medium uppercase tracking-wider">
              Tap to view →
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Desktop fanned layout - isSpotlit highlights the card when auto-cycling
  const isHighlighted = isHovering || isSpotlit;

  // Get links count
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
        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s',
        perspective: '1000px',
      }}
    >
      {/* Avatar - positioned half outside */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
        <div
          className={`w-20 h-20 rounded-full overflow-hidden bg-[#1a1a1a] shadow-lg ${isVerified ? 'ring-4 ring-[#22c55e]' : 'ring-4 ring-[#f5c542]'}`}
          style={{
            transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.3s ease-out',
          }}
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
        className={`bg-[#faf6ed] w-[180px] h-[280px] rounded-2xl border-2 border-[#f5c542] p-4 pt-14 text-center shadow-2xl flex flex-col ${isSpotlit && !isHovering ? `card-shimmer ${shimmerSpeed}` : ''}`}
        style={{
          transform: isHovering
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.08)`
            : isSpotlit
              ? 'rotateX(0) rotateY(0) scale(1.05)'
              : 'rotateX(0) rotateY(0) scale(1)',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.2s ease-out, box-shadow 0.3s ease-out',
          boxShadow: isHovering
            ? '0 35px 60px -15px rgba(245, 197, 66, 0.4)'
            : isSpotlit
              ? '0 25px 50px -12px rgba(245, 197, 66, 0.3), 0 20px 40px -10px rgba(0, 0, 0, 0.3)'
              : '0 15px 35px -10px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Name with verified badge */}
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

        {/* Username */}
        <p className="text-[10px] text-[#1a1a1a]/60 mb-2">@{profile.name}</p>

        {/* Bio snippet - always reserve space */}
        <p className="text-[9px] text-[#1a1a1a]/70 mb-2 line-clamp-2 leading-relaxed px-1 min-h-[28px]">
          {profile.bio || <span className="invisible">Bio placeholder</span>}
        </p>

        {/* Address pill with icons inside */}
        {profile.address && (
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-lg px-2.5 py-1">
              <span className="font-mono text-[8px] text-[#1a1a1a] leading-none">
                {profile.address.slice(0, 4)}...{profile.address.slice(-4)}
              </span>
              {/* QR Code icon */}
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
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
                className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Links section - show icons + usernames */}
        {totalLinks > 0 && (
          <div className="mt-auto w-full">
            <div className="bg-white/80 rounded-lg border border-[#e5e5e5] px-1.5 py-1">
              <div className="flex flex-col gap-0.5">
                {(profile.links || []).slice(0, 3).map((link, i) => {
                  let faviconUrl = '';
                  try {
                    const domain = new URL(link.url || '').hostname;
                    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                  } catch { faviconUrl = ''; }
                  const iconSrc = link.icon?.src || link.icon || faviconUrl;
                  return (
                    <div key={i} className="flex items-center gap-1 min-w-0">
                      {iconSrc && (
                        <img
                          src={iconSrc}
                          alt=""
                          className="w-3 h-3 rounded-sm object-contain shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <span className="text-[8px] text-[#1a1a1a]/70 truncate">
                        {link.label || link.url?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || 'Link'}
                      </span>
                    </div>
                  );
                })}
                {totalLinks > 3 && (
                  <span className="text-[7px] text-[#1a1a1a]/40 text-center">
                    +{totalLinks - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* City/Location if available */}
        {profile.nearest_city && (
          <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-[#1a1a1a]/50">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="truncate max-w-[100px]">{profile.nearest_city}</span>
          </div>
        )}

        {/* View profile hint */}
        <div className="mt-auto pt-2">
          <span className="text-[8px] text-[#f5c542] font-medium uppercase tracking-wider">
            View Profile →
          </span>
        </div>
      </div>
    </div>
  );
}

// Featured Cards Section with mobile shuffle
function FeaturedCardsSection({ featuredProfiles, onCardClick }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimeout = useRef(null);

  // Reorder profiles so Frank is in the middle
  const reorderedProfiles = useMemo(() => {
    const frankIdx = featuredProfiles.findIndex(p =>
      p.name?.toLowerCase() === 'frank' || p.display_name?.toLowerCase() === 'frank'
    );

    if (frankIdx < 0) return featuredProfiles;

    // Calculate center position
    const centerIdx = Math.floor(featuredProfiles.length / 2);

    // If Frank is already in center, return as is
    if (frankIdx === centerIdx) return featuredProfiles;

    // Reorder: move profiles so Frank ends up at center
    const reordered = [...featuredProfiles];
    const frank = reordered.splice(frankIdx, 1)[0];
    reordered.splice(centerIdx, 0, frank);

    return reordered;
  }, [featuredProfiles]);

  // Start from center (Frank's position) and cycle towards right
  const centerIndex = Math.floor(reorderedProfiles.length / 2);
  const [activeCardIndex, setActiveCardIndex] = useState(centerIndex);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup interaction timeout on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    };
  }, []);

  // Auto-spotlight cards (works on both mobile and desktop when not interacting)
  // Cycles from center (Frank) towards right, then wraps around
  useEffect(() => {
    if (reorderedProfiles.length <= 1 || isInteracting) return;
    const interval = setInterval(() => {
      setActiveCardIndex(prev => (prev + 1) % reorderedProfiles.length);
    }, 3500); // Cycle every 3.5 seconds for smoother viewing
    return () => clearInterval(interval);
  }, [reorderedProfiles.length, isInteracting]);

  // Handle hover - pause auto-spotlight but don't change active card
  const handleHoverStart = () => {
    setIsInteracting(true);
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
  };

  const handleHoverEnd = () => {
    // Resume auto-spotlight after 3 seconds of no interaction
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    interactionTimeout.current = setTimeout(() => {
      setIsInteracting(false);
    }, 3000);
  };

  // Handle click - bring card to center
  const handleCardClick = (index, profile) => {
    if (isMobile) {
      // On mobile, just set active
      setActiveCardIndex(index);
    } else {
      // On desktop, if already centered, navigate to profile
      if (index === activeCardIndex) {
        onCardClick(profile);
      } else {
        // Bring to center first
        setActiveCardIndex(index);
        setIsInteracting(true);
        if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
        interactionTimeout.current = setTimeout(() => {
          setIsInteracting(false);
        }, 5000); // Longer pause after click
      }
    }
  };

  // Card configuration - Zcash brand colors
  // Primary: #F4B728 (yellow), #231F20 (black)
  const cardColors = [
    'bg-[#F4B728]', // Zcash yellow (primary)
    'bg-[#1e5c3a]', // Forest green (for Encrypted James)
    'bg-[#1a1a1a]', // near black
    'bg-[#D4A020]', // darker gold
    'bg-[#2d2d2d]', // charcoal
    'bg-[#FFD54F]', // lighter yellow
  ];
  const patternTypes = ['lines', 'grid', 'waves', 'blocks', 'circles', 'dots'];
  const shimmerSpeeds = ['', 'card-shimmer-fast', 'card-shimmer-slow', '', 'card-shimmer-fast', 'card-shimmer-slow'];

  // Get card color - special case for specific profiles
  const getCardColor = (profile, index) => {
    // Encrypted James / Zechariah gets green
    if (profile.display_name === 'Encrypted James' || profile.name === 'Zechariah') {
      return 'bg-[#1e5c3a]';
    }
    return cardColors[index % cardColors.length];
  };

  // Dynamic spread with arc shape (cards curve upward in center)
  const getLayoutConfig = (count) => {
    if (count === 1) {
      return { rotations: [0], offsets: [0], verticalOffsets: [0], zIndexes: [1] };
    }
    if (count === 2) {
      return {
        rotations: [-10, 10],
        offsets: [-100, 100],
        verticalOffsets: [20, 20], // edges lower
        zIndexes: [1, 2],
      };
    }
    if (count === 3) {
      return {
        rotations: [-12, 0, 12],
        offsets: [-130, 0, 130],
        verticalOffsets: [35, 0, 35], // center highest
        zIndexes: [1, 3, 2],
      };
    }
    if (count === 4) {
      return {
        rotations: [-14, -5, 5, 14],
        offsets: [-150, -50, 50, 150],
        verticalOffsets: [45, 15, 15, 45], // arc curve
        zIndexes: [1, 2, 3, 2],
      };
    }
    if (count === 5) {
      return {
        rotations: [-15, -8, 0, 8, 15],
        offsets: [-170, -85, 0, 85, 170],
        verticalOffsets: [55, 25, 0, 25, 55], // arc curve
        zIndexes: [1, 2, 3, 3, 2],
      };
    }
    // 6 or more - wide arc
    return {
      rotations: [-16, -10, -4, 4, 10, 16],
      offsets: [-190, -114, -38, 38, 114, 190],
      verticalOffsets: [65, 35, 10, 10, 35, 65], // arc curve
      zIndexes: [1, 2, 3, 4, 3, 2],
    };
  };

  const baseLayout = getLayoutConfig(reorderedProfiles.length);

  // Desktop: Calculate position relative to active card (active card goes to center)
  // This creates a shuffle effect where the spotlight card moves to center
  const getDesktopPosition = (index) => {
    const count = reorderedProfiles.length;
    const centerIdx = Math.floor(count / 2);

    // Calculate the visual position - shift so active card is at center
    // relativePos: where this card should appear (0 = center, negative = left, positive = right)
    const relativePos = index - activeCardIndex;
    const visualIdx = centerIdx + relativePos;

    // Wrap around for cards that go off the edges
    const wrappedIdx = ((visualIdx % count) + count) % count;

    return {
      rotation: baseLayout.rotations[wrappedIdx] || 0,
      offset: baseLayout.offsets[wrappedIdx] || 0,
      verticalOffset: baseLayout.verticalOffsets[wrappedIdx] || 0,
      zIndex: baseLayout.zIndexes[wrappedIdx] || 1,
    };
  };

  // Reorder cards for mobile shuffle (active card on top)
  // Creates a circular stack where active card is always on top (index 0)
  // and others are layered behind in order
  const getStackIndex = (index) => {
    if (!isMobile) return index;
    // Calculate position relative to active card
    // Active card = 0, next card = 1, etc.
    const diff = (index - activeCardIndex + reorderedProfiles.length) % reorderedProfiles.length;
    return diff;
  };

  if (reorderedProfiles.length === 0) return null;

  return (
    <div className="mb-16" style={{ overflowX: 'clip' }}>
      {/* Featured Profiles heading - above the arc */}
      <h2 className="text-center text-sm uppercase tracking-widest text-[#faf6ed]/40 mb-8 md:mb-12">
        Featured Profiles
      </h2>

      {/* Cards Container - taller to accommodate arc shape */}
      <div className="relative flex justify-center items-start h-[340px] md:h-[420px] pt-12 md:pt-16" style={{ overflowX: 'clip' }}>
        {reorderedProfiles.map((profile, index) => {
          const cardColor = getCardColor(profile, index);
          const patternType = patternTypes[index % patternTypes.length];
          // Light backgrounds (yellows) need dark text
          const isLightBg = ['bg-[#F4B728]', 'bg-[#D4A020]', 'bg-[#FFD54F]'].includes(cardColor);
          const textColor = isLightBg ? 'text-[#231F20]' : 'text-[#faf6ed]';
          const textColorMuted = isLightBg ? 'text-[#231F20]/70' : 'text-[#faf6ed]/70';
          const stackIndex = getStackIndex(index);
          const isActive = isMobile && index === activeCardIndex;

          // Desktop spotlight: highlight active card when not interacting
          const isSpotlit = !isMobile && index === activeCardIndex;

          // Get dynamic position for desktop (shuffle to center)
          const desktopPos = getDesktopPosition(index);

          return (
            <FannedCard
              key={profile.id ?? profile.address}
              profile={profile}
              cardColor={cardColor}
              patternType={patternType}
              rotation={desktopPos.rotation}
              offset={desktopPos.offset}
              verticalOffset={desktopPos.verticalOffset}
              zIndex={desktopPos.zIndex}
              textColor={textColor}
              textColorMuted={textColorMuted}
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

      {/* Mobile card indicators */}
      {isMobile && reorderedProfiles.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {reorderedProfiles.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveCardIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === activeCardIndex
                  ? 'bg-[#f5c542] w-6'
                  : 'bg-[#faf6ed]/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
import FlickeringFooter from "./components/ui/FlickeringFooter";
import { BorderBeam } from "./components/ui/BorderBeam";
// import Toast from "./Toast";
// import useToastMessage from "./hooks/useToastMessage";

import ProfileCard from "./components/ProfileCard";
import ProfileSearchDropdown from "./components/ProfileSearchDropdown";

import LetterGridModal from "./components/LetterGridModal";
import AlphabetSidebar from "./components/AlphabetSidebar";
import LoadingDots from "./components/LoadingDots";

import useProfiles from "./hooks/useProfiles";
import useProfileRouting from "./hooks/useProfileRouting";
import useAlphaVisibility from "./hooks/useAlphaVisibility";
import useDirectoryVisibility from "./hooks/useDirectoryVisibility";

import computeGoodThru from "./utils/computeGoodThru";
import { useFeedback } from "./hooks/useFeedback";


export default function Directory({
  initialProfiles = null,
  initialSelectedAddress = null,
  initialShowDirectory = true,
  initialStats = null,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setSelectedAddress, selectedAddress } = useFeedback();
  const effectiveSelectedAddress = selectedAddress ?? initialSelectedAddress;

  useEffect(() => {
    if (!selectedAddress && initialSelectedAddress) {
      setSelectedAddress(initialSelectedAddress);
    }
  }, [initialSelectedAddress, selectedAddress, setSelectedAddress]);

  const { profiles, loading, addProfile } = useProfiles(initialProfiles, true);
  const { showDirectory, setShowDirectory } = useDirectoryVisibility(
    initialShowDirectory
  );
  const showAlpha = useAlphaVisibility(showDirectory);
  // const { toastMsg, showToast, closeToast } = useToastMessage();
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [suppressDropdown, setSuppressDropdown] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("suppressSearchDropdown") === "1";
  });

  // Update search if query params change (e.g. navigation from Splash Page)
  useEffect(() => {
    const querySearch = searchParams.get("search");
    const autoOpenAdd = searchParams.get("autoOpenAdd");
    const shouldClearParams = querySearch !== null || autoOpenAdd !== null;

    if (querySearch !== null) {
      setSearch(querySearch);
      setFilters({
        verified: false,
        referred: false,
        ranked: false,
        featured: false,
      });
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("suppressSearchDropdown");
      }
      setSuppressDropdown(true);
    }

    if (autoOpenAdd === "1") {
      setIsJoinOpen(true);
    }

    if (shouldClearParams) {
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const [activeLetter, setActiveLetter] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // multi-filter state
  const [filters, setFilters] = useState({
    verified: false,
    referred: false,
    ranked: false,
    featured: true, // default to featured profiles
  });

  const searchBarRef = useRef(null);
  const stickyTriggerRef = useRef(null);
  const [isSearchBarFixed, setIsSearchBarFixed] = useState(false);

  // Detect when sticky search bar hits the top
  useEffect(() => {
    if (!stickyTriggerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSearchBarFixed(!entry.isIntersecting);
      },
      { rootMargin: '0px 0px 0px 0px', threshold: 0 }
    );

    observer.observe(stickyTriggerRef.current);
    return () => observer.disconnect();
  }, []);

  useProfileRouting(
    profiles,
    effectiveSelectedAddress,
    setSelectedAddress,
    showDirectory,
    setShowDirectory
  );




  // compute referrals (RefRank)
  const { rankedProfiles } = useMemo(() => {
    const norm = (s) =>
      (s || "")
        .toString()
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/ /g, "_")
        .replace(/[^a-z0-9_]/g, "");

    const idByIdentity = new Map();
    const metaById = new Map();
    profiles.forEach((p) => {
      const nName = norm(p.name);
      if (nName) idByIdentity.set(nName, p.id);
      const nSlug = norm(p.slug);
      if (nSlug) idByIdentity.set(nSlug, p.id);
      const joinDate = p.joined_at || p.created_at || p.since || null;
      metaById.set(p.id, { since: joinDate, name: p.name || "" });
    });

    const countsById = new Map();
    profiles.forEach((p) => {
      const ref = norm(p.referred_by);
      if (!ref) return;
      const refId = idByIdentity.get(ref);
      if (!refId) return;
      countsById.set(refId, (countsById.get(refId) || 0) + 1);
    });

    const sorted = Array.from(countsById.entries()).sort(
      ([idA, cA], [idB, cB]) => {
        if (cB !== cA) return cB - cA;
        const a = metaById.get(idA) || {};
        const b = metaById.get(idB) || {};
        const aSince = a.since
          ? new Date(a.since).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bSince = b.since
          ? new Date(b.since).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (aSince !== bSince) return aSince - bSince;
        const aName = (a.name || "").toLowerCase();
        const bName = (b.name || "").toLowerCase();
        return aName.localeCompare(bName);
      }
    );

    const rankById = new Map();
    sorted.slice(0, 10).forEach(([id], idx) => rankById.set(id, idx + 1));

    const countsByIdentity = {};
    idByIdentity.forEach((id, ident) => {
      const c = countsById.get(id) || 0;
      if (c > 0) countsByIdentity[ident] = c;
    });

    const enriched = profiles.map((p) => {
      const verifiedLinks =
        p.verified_links_count ??
        (p.links?.filter((l) => l.is_verified).length || 0);
      const verifications = (p.address_verified ? 1 : 0) + verifiedLinks;
      const refRank = rankById.get(p.id) || 0;

      return {
        ...p,
        verifications,
        refRank,
        referral_rank: refRank || p.referral_rank || 0, // 🟠 ensure backward-compatible rank field
        featured: p.featured === true,
      };
    });


    return { referralCounts: countsByIdentity, rankedProfiles: enriched };
  }, [profiles]);

  const processedProfiles = rankedProfiles;

  const selectedProfile = useMemo(() => {
    const match = processedProfiles.find(
      (p) => p.address === effectiveSelectedAddress
    );
    if (!match) return null;
    const joinedAt = match.joined_at || match.created_at || match.since || null;
    const good_thru = computeGoodThru(joinedAt, match.last_signed_at);
    return { ...match, good_thru };
  }, [processedProfiles, selectedAddress]);

  // ✅ Keep feedback form in sync with the active profile (for /:username route)
  // ✅ Keep feedback form in sync with the active profile (for /:username route)
  useEffect(() => {
    if (selectedProfile?.address) {
      setSelectedAddress(selectedProfile.address);

      // 🪪 Dev-only log to confirm the sync link
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🪪 Feedback linked to ${selectedProfile.name || "(unknown)"} (zId: ${selectedProfile.id
          })`
        );
      }
    }
  }, [selectedProfile?.address, selectedProfile?.id, selectedProfile?.name, setSelectedAddress]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!dropdownRef.current) return;
      if (!searchInputRef.current) return;

      const insideDropdown = dropdownRef.current.contains(e.target);
      const insideInput = searchInputRef.current.contains(e.target);

      if (!insideDropdown && !insideInput) {
        // Previously this cleared the search and reset the directory.
        // That’s why your filter disappears when you click any card.
        console.log(
          "[DIR] clickOutside search - NOT clearing search anymore. target:",
          e.target
        );
        // setSearch(""); // ← removed to keep search filter when clicking cards
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // filter + grouping logic
  const { sorted, grouped, letters } = useMemo(() => {
    let s = [...processedProfiles].filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    const { verified, referred, ranked, featured } = filters;

    if (verified) {
      s = s.filter((p) => p.address_verified || (p.verifications ?? 0) > 0);
    }
    if (referred) {
      s = s.filter((p) => !!p.referred_by);
    }
    // Defining who appears under Ranked filter (top 10 in any leaderboard period)
    if (ranked) {
      s = s.filter((p) => {
        const allRank = Number(p.rank_alltime) || 0;
        const weekRank = Number(p.rank_weekly) || 0;
        const monthRank = Number(p.rank_monthly) || 0;
        return (
          (allRank > 0 && allRank <= 10) ||
          (weekRank > 0 && weekRank <= 10) ||
          (monthRank > 0 && monthRank <= 10)
        );
      });
    }


    if (featured) {
      s = s.filter((p) => Boolean(p.featured) === true);
    }

    s.sort((a, b) => a.name.localeCompare(b.name));

    const g = s.reduce((acc, p) => {
      const first = p.name?.[0]?.toUpperCase() || "#";
      (acc[first] ||= []).push(p);
      return acc;
    }, {});
    const L = Object.keys(g).sort();

    return { sorted: s, grouped: g, letters: L };
  }, [processedProfiles, search, filters]);

  const [showLetterGrid, setShowLetterGrid] = useState(false);

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 70;
      window.scrollTo({ top: offset, behavior: "smooth" });
      setActiveLetter(letter);
      clearTimeout(scrollToLetter._t);
      scrollToLetter._t = setTimeout(() => setActiveLetter(null), 600);
    }
  };

  const handleGridSelect = (letter) => {
    setShowLetterGrid(false);
    setTimeout(() => scrollToLetter(letter), 200);
  };

  const toggleFilter = (key) => {
    setFilters((prev) => {
      const next = { verified: false, referred: false, ranked: false, featured: false };
      // If clicking an already active filter → deselect all
      if (prev[key]) return next;
      // Otherwise, activate only the chosen one
      next[key] = true;
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ verified: false, referred: false, ranked: false });
  };

  const anyFilterActive = Object.values(filters).some(Boolean);

  const normalizeSlug = (value = "") =>
    value
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, "");

  const buildSlug = (profile) => {
    if (!profile?.name) return "";
    const base = normalizeSlug(profile.name);
    if (!base) return "";
    if (profile.slug) return profile.slug;
    return profile.address_verified ? base : `${base}-${profile.id}`;
  };

  // Get 6 featured profiles for landing page
  const featuredProfiles = useMemo(() => {
    const featured = processedProfiles.filter(p => p.featured);
    // If not enough featured, take first 6 profiles
    return featured.length >= 6 ? featured.slice(0, 6) : processedProfiles.slice(0, 6);
  }, [processedProfiles]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <LoadingDots
          colors={["#f5c542", "#22c55e", "#f5c542", "#22c55e"]}
          className="mt-20"
        />
      </div>
    );

  // Landing page view (when no profile selected and showing directory)
  if (showDirectory && !selectedProfile) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] w-full">
          {/* Logo/Brand */}
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

          {/* Sentinel element for detecting when sticky activates */}
          <div ref={stickyTriggerRef} className="h-0 w-full" aria-hidden="true" />

          {/* Search Bar - Sticky on scroll - Works on both mobile and desktop */}
          <div
            ref={searchBarRef}
            className={`sticky top-0 z-[100] py-3 md:py-4 px-4 md:px-0 transition-all duration-500 ease-out ${
              isSearchBarFixed
                ? 'bg-[#0d0d0d]/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-[#faf6ed]/10'
                : 'bg-[#0d0d0d] shadow-none border-b border-transparent'
            }`}
          >
            <div className="w-full max-w-sm md:max-w-lg mx-auto">
              {(() => {
                const exactMatch = search ? profiles.find(p => p.name.toLowerCase() === search.toLowerCase()) : null;
                const isAvailable = search && !exactMatch;
                const isTaken = search && exactMatch;

                return (
                  <>
                    <div className="relative">
                      <div className="relative flex items-center bg-[#faf6ed] rounded-full px-4 md:px-5 py-2.5 md:py-3">
                        <BorderBeam
                          lightColor={isAvailable ? "#22c55e" : "#f5c542"}
                          lightWidth={300}
                          duration={6}
                          borderWidth={2}
                        />
                        <span className="text-[#1a1a1a]/40 font-medium text-sm md:text-base shrink-0">zcash.me/</span>
                        <div className="flex-1 min-w-0">
                          <input
                            ref={searchInputRef}
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value);
                              setSuppressDropdown(false);
                              setFilters({ verified: false, referred: false, ranked: false, featured: false });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && search) {
                                if (exactMatch) {
                                  // Navigate to profile
                                  window.lastSelectionWasExplicit = true;
                                  setSelectedAddress(exactMatch.address);
                                  setShowDirectory(false);
                                  const slug = buildSlug(exactMatch);
                                  if (slug) router.push(`/${slug}`);
                                } else {
                                  // Claim username
                                  setIsJoinOpen(true);
                                }
                              }
                            }}
                            placeholder="search or claim username"
                            className="w-full px-1 py-0.5 text-sm md:text-base bg-transparent text-[#1a1a1a] placeholder-[#1a1a1a]/30 outline-none"
                          />
                        </div>

                      {/* Dynamic button based on availability */}
                      {isTaken ? (
                        <button
                          onClick={() => {
                            window.lastSelectionWasExplicit = true;
                            setSelectedAddress(exactMatch.address);
                            setShowDirectory(false);
                            const slug = buildSlug(exactMatch);
                            if (slug) router.push(`/${slug}`);
                          }}
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
                          onClick={() => setIsJoinOpen(true)}
                          className={`ml-2 md:ml-3 p-2 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                            isAvailable
                              ? 'bg-[#22c55e] text-white hover:bg-[#16a34a]'
                              : 'bg-[#1a1a1a] text-[#faf6ed] hover:bg-[#2a2a2a]'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="hidden md:inline">{isAvailable ? 'Claim' : 'Claim'}</span>
                        </button>
                      )}
                      </div>

                      {/* Dropdown - show when searching (positioned outside search bar for full width) */}
                      {search && !suppressDropdown && (
                        <div
                          ref={dropdownRef}
                          className="absolute left-0 right-0 top-full mt-2 z-[9999]"
                        >
                          <ProfileSearchDropdown
                            listOnly={true}
                            value={search}
                            onChange={(v) => {
                              if (typeof v === "object") {
                                window.lastSelectionWasExplicit = true;
                                const addr = v.address;
                                setSelectedAddress(addr);
                                window.dispatchEvent(
                                  new CustomEvent("selectAddress", { detail: { address: addr } })
                                );
                                setShowDirectory(false);
                                const slug = buildSlug(v);
                                if (slug) router.push(`/${slug}`);
                              } else {
                                setSearch(v);
                              }
                            }}
                            onClaimClick={() => setIsJoinOpen(true)}
                            profiles={profiles}
                            placeholder="search"
                          />
                        </div>
                      )}
                    </div>

                    {/* Status message */}
                    {search && (
                      <div className="text-center mt-3">
                        {isTaken ? (
                          <p className="text-sm text-[#faf6ed]/70 flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#f97316]"></span>
                            <span><strong className="text-[#f5c542]">{exactMatch.display_name || exactMatch.name}</strong> already exists</span>
                            <span className="text-[#faf6ed]/40">•</span>
                            <button
                              onClick={() => {
                                window.lastSelectionWasExplicit = true;
                                setSelectedAddress(exactMatch.address);
                                setShowDirectory(false);
                                const slug = buildSlug(exactMatch);
                                if (slug) router.push(`/${slug}`);
                              }}
                              className="text-[#22c55e] hover:underline font-medium"
                            >
                              View profile →
                            </button>
                          </p>
                        ) : (
                          <p className="text-sm text-[#22c55e] flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
                            <strong>zcash.me/{search}</strong> is available!
                          </p>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Divider */}
          <div className="max-w-xs mx-auto border-t border-[#faf6ed]/10 mt-8 mb-8 md:mb-12" />

          {/* Featured Profiles Section - Fanned Parallax Cards */}
          <FeaturedCardsSection
            featuredProfiles={featuredProfiles}
            onCardClick={(profile) => {
              window.lastSelectionWasExplicit = true;
              setSelectedAddress(profile.address);
              setShowDirectory(false);
              const slug = buildSlug(profile);
              if (slug) router.push(`/${slug}`);
            }}
          />

          {/* Divider */}
          <div className="max-w-xs mx-auto border-t border-[#faf6ed]/10 my-6 md:my-16" />

          {/* How it works */}
          <div className="max-w-2xl mx-auto text-center mb-6 md:mb-16 px-4">
            <h2 className="text-[10px] md:text-sm uppercase tracking-widest text-[#faf6ed]/40 mb-4 md:mb-8">
              How it works
            </h2>
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

          {/* All Profiles Directory Section */}
          <div id="directory-section" className="max-w-2xl mx-auto px-4 pb-24">
            {/* Divider */}
            <div className="max-w-xs mx-auto border-t border-[#faf6ed]/10 mb-8" />

            {/* Filter Tags - Horizontal scroll on mobile */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4 mb-4 md:mb-6 scrollbar-hide">
              <div className="flex gap-1.5 md:gap-2 min-w-max md:flex-wrap md:justify-center">
                <button
                  onClick={() => toggleFilter('featured')}
                  className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                    filters.featured
                      ? 'bg-[#f5c542] text-[#1a1a1a]'
                      : 'bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10'
                  }`}
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className={`${filters.featured ? 'inline' : 'hidden'} sm:inline`}>Featured</span>
                  <span className={`bg-white/20 px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] ${filters.featured ? 'inline' : 'hidden sm:inline'}`}>{processedProfiles.filter(p => p.featured).length}</span>
                </button>
                <button
                  onClick={() => toggleFilter('ranked')}
                  className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                    filters.ranked
                      ? 'bg-[#f97316] text-white'
                      : 'bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10'
                  }`}
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                  <span className={`${filters.ranked ? 'inline' : 'hidden'} sm:inline`}>Top Rank</span>
                  <span className={`bg-white/20 px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] ${filters.ranked ? 'inline' : 'hidden sm:inline'}`}>{processedProfiles.filter(p => {
                    const allRank = Number(p.rank_alltime) || 0;
                    const weekRank = Number(p.rank_weekly) || 0;
                    const monthRank = Number(p.rank_monthly) || 0;
                    return (allRank > 0 && allRank <= 10) || (weekRank > 0 && weekRank <= 10) || (monthRank > 0 && monthRank <= 10);
                  }).length}</span>
                </button>
                <button
                  onClick={() => toggleFilter('verified')}
                  className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                    filters.verified
                      ? 'bg-[#22c55e] text-white'
                      : 'bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10'
                  }`}
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className={`${filters.verified ? 'inline' : 'hidden'} sm:inline`}>Verified</span>
                  <span className={`bg-white/20 px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] ${filters.verified ? 'inline' : 'hidden sm:inline'}`}>{processedProfiles.filter(p => p.address_verified || (p.verifications ?? 0) > 0).length}</span>
                </button>
                <button
                  onClick={() => setFilters({ verified: false, referred: false, ranked: false, featured: false })}
                  className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                    !filters.verified && !filters.referred && !filters.ranked && !filters.featured
                      ? 'bg-[#3b82f6] text-white'
                      : 'bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10'
                  }`}
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span className={`${!filters.verified && !filters.referred && !filters.ranked && !filters.featured ? 'inline' : 'hidden'} sm:inline`}>All</span>
                  <span className={`bg-white/20 px-1 md:px-1.5 py-0.5 rounded-full text-[8px] md:text-[10px] ${!filters.verified && !filters.referred && !filters.ranked && !filters.featured ? 'inline' : 'hidden sm:inline'}`}>{processedProfiles.length}</span>
                </button>
                <button
                  onClick={() => setShowStats(prev => !prev)}
                  className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium transition-all whitespace-nowrap ${
                    showStats
                      ? 'bg-[#8b5cf6] text-white'
                      : 'bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10'
                  }`}
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className={`${showStats ? 'inline' : 'hidden'} sm:inline`}>Stats</span>
                </button>
                <button
                  onClick={() => {
                    const feedbackSection = document.getElementById('zcash-feedback');
                    if (feedbackSection) {
                      feedbackSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-medium bg-[#1a1a1a] text-[#faf6ed]/70 hover:bg-[#2a2a2a] border border-[#faf6ed]/10 transition-all whitespace-nowrap"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Feedback</span>
                </button>
              </div>
            </div>

            <h2 className="text-center text-[10px] md:text-sm uppercase tracking-widest text-[#faf6ed]/40 mb-4 md:mb-6">
              {search ? `Results for "${search}"` : filters.featured ? 'Featured Profiles' : filters.ranked ? 'Top Ranked' : filters.verified ? 'Verified Profiles' : 'All Profiles'}
            </h2>

            {/* Stats Section */}
            {showStats && (
              <div className="mb-6">
                <ZcashStats stats={initialStats} />
              </div>
            )}

            {/* Profile Cards List - Alphabetically grouped */}
            <div className="flex flex-col gap-1.5 md:gap-3 max-w-[280px] md:max-w-md mx-auto">
              {letters.map((letter) => (
                <div key={letter} id={`letter-${letter}`}>
                  {/* Letter Header */}
                  <div className={`sticky top-0 z-10 py-1.5 md:py-2 px-2 md:px-3 mb-1.5 md:mb-2 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-[#faf6ed]/10 transition-colors ${activeLetter === letter ? 'bg-[#f5c542]/20' : ''}`}>
                    <span className="text-[#f5c542] font-bold text-sm md:text-lg">{letter}</span>
                    <span className="text-[#faf6ed]/40 text-[10px] md:text-sm ml-1.5 md:ml-2">({grouped[letter]?.length || 0})</span>
                  </div>

                  {/* Profiles under this letter */}
                  <div className="flex flex-col gap-1.5 md:gap-3">
                    {grouped[letter]?.map((profile) => (
                      <div
                        key={profile.id ?? profile.address}
                        onClick={() => {
                          window.lastSelectionWasExplicit = true;
                          setSelectedAddress(profile.address);
                          setShowDirectory(false);
                          const slug = buildSlug(profile);
                          if (slug) router.push(`/${slug}`);
                        }}
                        className="bg-[#faf6ed] rounded-lg md:rounded-2xl border border-[#f5c542]/50 p-2 md:p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-[#f5c542]/20 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2 md:gap-4">
                          {/* Avatar with green border for verified */}
                          <div className={`relative shrink-0 w-7 h-7 md:w-14 md:h-14 rounded-full ${profile.address_verified ? 'ring-1 md:ring-2 ring-[#22c55e]' : 'ring-1 md:ring-2 ring-[#f5c542]'} overflow-hidden bg-[#1a1a1a]`}>
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
                            <span className="text-[10px] md:text-sm text-[#1a1a1a]/60">
                              @{profile.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Alphabet Sidebar for quick navigation */}
            <AlphabetSidebar
              letters={letters}
              activeLetter={activeLetter}
              onSelect={scrollToLetter}
              show={letters.length > 3}
            />
          </div>

          <AddUserForm
            isOpen={isJoinOpen}
            onClose={() => setIsJoinOpen(false)}
            onUserAdded={(newProfile) => {
              addProfile(newProfile);
              setIsJoinOpen(false);
            }}
          />

          {/* Flickering Tagline Footer */}
          <FlickeringFooter />
        </div>
    );
  }

  // Profile view (when a profile is selected)
  return (
    <>
      <div className="relative max-w-md mx-auto px-4 pb-24 pt-6 min-h-screen">
        {/* Back to directory */}
        <button
          onClick={() => {
            setShowDirectory(true);
            setSelectedAddress(null);
            router.push('/');
          }}
          className="mb-6 text-[#faf6ed]/50 text-sm hover:text-[#f5c542] transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to directory
        </button>

        {selectedProfile && (
          <ProfileCard
            key={selectedProfile.address}
            profile={selectedProfile}
            onSelect={() => { }}
            fullView
            warning={{
              message: `${selectedProfile.name} may not be who you think.`,
              link: "#",
            }}
            cacheVersion={
              selectedProfile.last_signed_at ||
              selectedProfile.created_at ||
              0
            }
          />
        )}

        <div id="zcash-feedback">
          <ZcashFeedback />
        </div>

        <AddUserForm
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
          onUserAdded={(newProfile) => {
            addProfile(newProfile);
            setIsJoinOpen(false);
          }}
        />
      </div>
    </>
  );
}



