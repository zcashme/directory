"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/profile/types";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import ProfileCardContent from "@/ui/profile/ProfileCardContent";
import { buildSlug } from "@/lib/profile/profileUtils";
import { parseProfileLinks } from "@/lib/profile/profileLinks";
import { resolveProfileVisualTheme } from "@/lib/profile/profileCardTheme";
import type { ProfileCardTextScale } from "@/ui/profile/ProfileCard";

const SHOW_TEMP_CARD_TUNER = false;
const SHOW_LAYOUT_POSITION_TUNER = false;

interface FannedCardAvatarProps {
  profile: Profile;
  size: number;
  isHighlighted: boolean;
  verifiedBadgeScale?: number;
}

function FannedCardAvatar({ profile, size, isHighlighted, verifiedBadgeScale = 1 }: FannedCardAvatarProps) {
  const isVerified = !!(profile.address_verified || (profile.verified_links_count ?? 0) > 0);
  return (
    <div className={`absolute ${size === 80 ? "-top-10" : "-top-12"} left-1/2 -translate-x-1/2 z-20`}>
      <div className="relative rounded-full border border-black p-0.5 bg-[var(--color-background)]" style={{ transform: isHighlighted ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}>
        <div className="[&>div]:!bg-[var(--color-background)] [&>div]:!border-0">
          <ProfileAvatar profile={profile} size={size} imageClassName="object-cover" className="shadow-lg" />
        </div>
        {isVerified && (
          <span
            className="absolute right-[1%] bottom-[1%] z-30 origin-center pointer-events-auto"
            style={{ transform: `translate(8%, 8%) scale(${verifiedBadgeScale})` }}
          >
            <VerifiedBadge verified={true} />
          </span>
        )}
      </div>
    </div>
  );
}

interface FannedCardProps {
  profile: Profile;
  rotation: number;
  offset: number;
  verticalOffset?: number;
  zIndex: number;
  onClick: () => void;
  isMobile: boolean;
  isActive: boolean;
  stackIndex: number;
  isSpotlit: boolean;
  shimmerSpeed?: string;
  textScaleOverrides?: Partial<ProfileCardTextScale>;
  avatarScale?: number;
}

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
  shimmerSpeed = "",
  textScaleOverrides,
  avatarScale = 1,
}: FannedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const { linksArray } = parseProfileLinks(profile);
  const isMaxi = profile.is_maxi === true || profile.is_maxi === 1 || String(profile.is_maxi ?? "").toLowerCase() === "true";
  const resolvedTheme = resolveProfileVisualTheme({
    isMaxi,
    profileThemePackage: profile.profile_theme_package,
    profileCardTheme: profile.profile_card_theme,
    profilePageBackground: profile.profile_page_bkgd,
    profileCardBorder: profile.profile_card_border,
  });
  const activeCardBackground = resolvedTheme.cardSurface;
  const resolvedCardBackground =
    activeCardBackground === "transparent" || /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(activeCardBackground)
      ? "var(--color-background)"
      : activeCardBackground;
  const activeBorderColor = resolvedTheme.borderColor ?? "#111827";

  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isMobile) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTilt({
      x: ((y - centerY) / centerY) * -10,
      y: ((x - centerX) / centerX) * 10
    });
  }, [isMobile]);

  const handleMouseEnter = () => {
    if (isMobile) return;
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
  };
  if (isMobile) {
    const stackOffset = isActive ? -16 : stackIndex * 8;
    const stackScale = isActive ? 1.05 : 1 - stackIndex * 0.03;
    const stackRotation = stackIndex === 0 ? 0 : (stackIndex % 2 === 0 ? 2 : -2) * (stackIndex * 0.5);
    const mobileZIndex = 60 - stackIndex;

    return (
      <div
        ref={cardRef}
        onClick={onClick}
        className="absolute cursor-pointer left-1/2"
        style={{
          transform: `translateX(-50%) translateY(${stackOffset}px) scale(${stackScale}) rotate(${isActive ? 0 : stackRotation}deg)`,
          zIndex: mobileZIndex,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          opacity: isActive ? 1 : Math.max(0.4, 1 - stackIndex * 0.15),
          transformOrigin: "center center",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <FannedCardAvatar
          profile={profile}
          size={Math.round(80 * avatarScale)}
          isHighlighted={isActive}
          verifiedBadgeScale={textScaleOverrides?.verifiedBadge ?? 1}
        />
        <div
          className={`w-[240px] rounded-2xl border border-gray-500 p-4 pt-16 shadow-xl text-center flex flex-col relative overflow-hidden ${isActive && shimmerSpeed ? "card-shimmer" : ""}`}
          style={{
            background: resolvedCardBackground,
            borderColor: activeBorderColor,
            minHeight: '360px',
            maxHeight: '400px',
            transform: isActive ? "scale(1)" : "scale(0.98)",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isActive
              ? "0 25px 50px -12px rgba(34, 197, 94, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2)"
              : "0 5px 15px -5px rgba(0, 0, 0, 0.15)",
          }}
        >
          <ProfileCardContent
            profile={profile}
            linksArray={linksArray}
            variant="mobile"
            linkVariant="simple"
            hideLinkBadges={true}
            textScaleOverrides={textScaleOverrides}
            showDisplayNameVerifiedBadge={false}
          />
        </div>
      </div>
    );
  }
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
      <FannedCardAvatar
        profile={profile}
        size={Math.round(100 * avatarScale)}
        isHighlighted={isHighlighted}
        verifiedBadgeScale={textScaleOverrides?.verifiedBadge ?? 1}
      />
      <div
        className={`w-[280px] rounded-2xl border border-gray-500 p-5 pt-20 text-center shadow-2xl flex flex-col relative overflow-hidden ${isSpotlit && !isHovering && shimmerSpeed ? "card-shimmer" : ""}`}
        style={{
          background: resolvedCardBackground,
          borderColor: activeBorderColor,
          minHeight: '400px',
          maxHeight: '460px',
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
        <ProfileCardContent
          profile={profile}
          linksArray={linksArray}
          variant="default"
          linkVariant="simple"
          hideLinkBadges={true}
          textScaleOverrides={textScaleOverrides}
          showDisplayNameVerifiedBadge={false}
        />
      </div>
    </div>
  );
}

interface FeaturedCardsSectionProps {
  profiles: Profile[];
  onCardClick: (profile: Profile) => void;
}

function FeaturedCardsSection({ profiles, onCardClick }: FeaturedCardsSectionProps) {
  type TunerScale = ProfileCardTextScale & { avatar: number };
  type TunerKey = keyof TunerScale;
  type LayoutTunerValues = { headlineY: number; carouselY: number };
  type LayoutTunerKey = keyof LayoutTunerValues;
  const defaultScale: TunerScale = {
    displayName: 1.4,
    verifiedBadge: 1,
    username: 1.3,
    bio: 1.5,
    meta: 1.35,
    address: 1.5,
    addressCopy: 1,
    linkIcon: 1,
    linkLabel: 1.45,
    linkDomain: 1.5,
    linkMore: 1.5,
    linkCopy: 1,
    viewProfile: 1.45,
    avatar: 1,
  };
  const controls: { key: TunerKey; label: string }[] = [
    { key: "displayName", label: "Display Name" },
    { key: "verifiedBadge", label: "Verified Badge" },
    { key: "username", label: "Username" },
    { key: "bio", label: "Bio" },
    { key: "meta", label: "Meta Line" },
    { key: "address", label: "Address Pill" },
    { key: "addressCopy", label: "Address Copy Btn" },
    { key: "linkIcon", label: "Link Icons" },
    { key: "linkLabel", label: "Link Labels" },
    { key: "linkDomain", label: "Link Domains" },
    { key: "linkMore", label: "Link +More" },
    { key: "linkCopy", label: "Link Copy Btn" },
    { key: "viewProfile", label: "View Profile Bar" },
    { key: "avatar", label: "Avatar" },
  ];
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [scale, setScale] = useState<TunerScale>(defaultScale);
  const [layoutTune, setLayoutTune] = useState<LayoutTunerValues>({ headlineY: -64, carouselY: -40 });
  const [copyLabel, setCopyLabel] = useState<string>("Copy");
  const [copyLayoutLabel, setCopyLayoutLabel] = useState<string>("Copy");
  const [animatedHeadline, setAnimatedHeadline] = useState<string>("");
  const [isTypedNameComplete, setIsTypedNameComplete] = useState<boolean>(false);
  const [isNameHoverPaused, setIsNameHoverPaused] = useState<boolean>(false);
  const [currentTypedProfileIndex, setCurrentTypedProfileIndex] = useState<number | null>(null);
  const activeCardIndexRef = useRef<number>(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const suppressTapUntilRef = useRef<number>(0);
  const manualTypingPauseUntilRef = useRef<number>(0);
  const manualResumeTargetRef = useRef<{ index: number; name: string } | null>(null);
  const MANUAL_TYPING_PAUSE_MS = 2600;
  const SWIPE_THRESHOLD_PX = 45;
  const TAP_CANCEL_THRESHOLD_PX = 12;

  const centerIndex = Math.floor(profiles.length / 2);
  const headlinePrefix = "The easiest way to Zcash ";
  const typedTargets = profiles.map((profile, index) => ({
    index,
    name: (profile.display_name?.trim() || profile.name?.trim() || "zcash user").trim(),
  }));
  const typedTargetsKey = typedTargets.map((target) => `${target.index}:${target.name}`).join("|");
  const pauseRef = useRef<boolean>(false);

  useEffect(() => {
    pauseRef.current = isNameHoverPaused;
  }, [isNameHoverPaused]);

  useEffect(() => {
    activeCardIndexRef.current = activeCardIndex;
  }, [activeCardIndex]);

  useEffect(() => {
    setActiveCardIndex(centerIndex);
  }, [centerIndex]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!typedTargets.length) {
      setAnimatedHeadline(`${headlinePrefix}you`);
      setIsTypedNameComplete(true);
      setCurrentTypedProfileIndex(null);
      return;
    }

    const initialText = `${headlinePrefix}you`;
    let currentText = "";
    let currentTargetIndex = centerIndex % typedTargets.length;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const HOLD_MS = 1400;
    const TYPE_MS = 90;
    const DELETE_MS = 75;
    const PAUSE_POLL_MS = 120;
    const isManualPauseActive = () => manualTypingPauseUntilRef.current > Date.now();
    const syncManualResumeTarget = () => {
      if (isManualPauseActive()) return false;
      if (!typedTargets.length) return false;
      const manualTarget = manualResumeTargetRef.current;
      if (!manualTarget) return false;

      const wrappedTargetIndex = ((manualTarget.index % typedTargets.length) + typedTargets.length) % typedTargets.length;
      const target = typedTargets[wrappedTargetIndex];
      const targetName = target?.name ?? manualTarget.name;

      currentText = `${headlinePrefix}${targetName}`;
      currentTargetIndex = (wrappedTargetIndex + 1) % typedTargets.length;
      setAnimatedHeadline(currentText);
      setIsTypedNameComplete(false);
      setCurrentTypedProfileIndex(target?.index ?? wrappedTargetIndex);
      manualResumeTargetRef.current = null;
      return true;
    };

    const schedule = (fn: () => void, delay: number) => {
      timeoutId = setTimeout(fn, delay);
    };

    const startTypingName = () => {
      if (isCancelled) return;
      if (isManualPauseActive()) {
        schedule(startTypingName, PAUSE_POLL_MS);
        return;
      }
      if (syncManualResumeTarget()) {
        schedule(startDeleting, DELETE_MS);
        return;
      }
      const target = typedTargets[currentTargetIndex];
      setCurrentTypedProfileIndex(target.index);
      const nextText = `${headlinePrefix}${target.name}`;
      if (currentText.length < nextText.length) {
        setIsTypedNameComplete(false);
        currentText = nextText.slice(0, currentText.length + 1);
        setAnimatedHeadline(currentText);
        schedule(startTypingName, TYPE_MS);
        return;
      }

      if (pauseRef.current) {
        schedule(startTypingName, PAUSE_POLL_MS);
        return;
      }

      setIsTypedNameComplete(true);
      setActiveCardIndex(target.index);
      schedule(() => {
        if (pauseRef.current) {
          schedule(startTypingName, PAUSE_POLL_MS);
          return;
        }
        setIsTypedNameComplete(false);
        currentTargetIndex = (currentTargetIndex + 1) % typedTargets.length;
        startDeleting();
      }, HOLD_MS);
    };

    const startDeleting = () => {
      if (isCancelled) return;
      if (isManualPauseActive()) {
        schedule(startDeleting, PAUSE_POLL_MS);
        return;
      }
      if (syncManualResumeTarget()) {
        schedule(startDeleting, DELETE_MS);
        return;
      }
      setIsTypedNameComplete(false);
      if (currentText.length > headlinePrefix.length) {
        currentText = currentText.slice(0, -1);
        setAnimatedHeadline(currentText);
        schedule(startDeleting, DELETE_MS);
        return;
      }
      schedule(startTypingName, TYPE_MS * 2);
    };

    const startTypingInitial = () => {
      if (isCancelled) return;
      if (isManualPauseActive()) {
        schedule(startTypingInitial, PAUSE_POLL_MS);
        return;
      }
      if (syncManualResumeTarget()) {
        schedule(startDeleting, DELETE_MS);
        return;
      }
      if (currentText.length < initialText.length) {
        setIsTypedNameComplete(false);
        currentText = initialText.slice(0, currentText.length + 1);
        setAnimatedHeadline(currentText);
        schedule(startTypingInitial, TYPE_MS);
        return;
      }
      setIsTypedNameComplete(true);
      setCurrentTypedProfileIndex(null);
      schedule(startDeleting, HOLD_MS);
    };

    setAnimatedHeadline("");
    setIsTypedNameComplete(false);
    schedule(startTypingInitial, TYPE_MS);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [typedTargetsKey, centerIndex, headlinePrefix]);


  if (!profiles.length) {
    return null;
  }

  const getDesktopPosition = (index: number) => {
    const count = profiles.length;
    const centerIdx = Math.floor(count / 2);
    const relativePos = index - activeCardIndex;
    const visualIdx = ((centerIdx + relativePos) % count + count) % count;
    const distanceFromCenter = Math.abs(visualIdx - centerIdx);
    const isLeft = visualIdx < centerIdx;

    return {
      rotation: distanceFromCenter === 0 ? 0 : (isLeft ? -12 : 12) + (distanceFromCenter - 1) * -2,
      offset: distanceFromCenter === 0 ? 0 : (isLeft ? -1 : 1) * (120 + distanceFromCenter * 50),
      verticalOffset: distanceFromCenter * 15,
      zIndex: count - distanceFromCenter,
    };
  };

  const getStackIndex = (index: number) => {
    if (!isMobile) return index;
    const count = profiles.length;
    if (!count) return index;
    return (index - activeCardIndex + count) % count;
  };

  const getWrappedIndex = (index: number) => {
    const count = profiles.length;
    if (count <= 0) return 0;
    return ((index % count) + count) % count;
  };

  const shiftActiveCard = (delta: number) => {
    if (profiles.length <= 1) return;
    const nextIndex = getWrappedIndex(activeCardIndexRef.current + delta);
    const selectedProfile = profiles[nextIndex];
    let selectedName: string | null = null;
    if (selectedProfile) {
      const displayName = selectedProfile.display_name?.trim();
      const profileName = selectedProfile.name?.trim();
      if (displayName && displayName.length > 0) {
        selectedName = displayName;
      } else if (profileName && profileName.length > 0) {
        selectedName = profileName;
      } else {
        selectedName = "zcash user";
      }
    }

    activeCardIndexRef.current = nextIndex;
    setActiveCardIndex(nextIndex);
    manualTypingPauseUntilRef.current = Date.now() + MANUAL_TYPING_PAUSE_MS;

    if (selectedName) {
      setAnimatedHeadline(`${headlinePrefix}${selectedName}`);
      setIsTypedNameComplete(true);
      setCurrentTypedProfileIndex(nextIndex);
      manualResumeTargetRef.current = { index: nextIndex, name: selectedName };
    }
  };

  const handleCarouselTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!isMobile || profiles.length <= 1) return;
    const touch = event.touches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeDeltaRef.current = { x: 0, y: 0 };
  };

  const handleCarouselTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!isMobile || profiles.length <= 1) return;
    const start = swipeStartRef.current;
    if (!start) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    swipeDeltaRef.current = { x: deltaX, y: deltaY };

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > TAP_CANCEL_THRESHOLD_PX) {
      suppressTapUntilRef.current = Date.now() + 250;
      if (event.cancelable) {
        event.preventDefault();
      }
    }
  };

  const handleCarouselTouchEnd = () => {
    if (!isMobile || profiles.length <= 1) {
      swipeStartRef.current = null;
      swipeDeltaRef.current = { x: 0, y: 0 };
      return;
    }

    const { x: deltaX, y: deltaY } = swipeDeltaRef.current;
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);

    if (horizontalDistance >= SWIPE_THRESHOLD_PX && horizontalDistance > verticalDistance) {
      shiftActiveCard(deltaX < 0 ? 1 : -1);
      suppressTapUntilRef.current = Date.now() + 300;
    }

    swipeStartRef.current = null;
    swipeDeltaRef.current = { x: 0, y: 0 };
  };

  const handleCarouselTouchCancel = () => {
    swipeStartRef.current = null;
    swipeDeltaRef.current = { x: 0, y: 0 };
  };

  const handleCardClick = (profile: Profile) => {
    if (Date.now() < suppressTapUntilRef.current) return;
    onCardClick(profile);
  };
  const step = 0.05;
  const minScale = 0.7;
  const maxScale = 1.8;
  const adjustScale = (key: TunerKey, delta: number) => {
    setScale((prev) => {
      const next = Math.min(maxScale, Math.max(minScale, Number((prev[key] + delta).toFixed(2))));
      return { ...prev, [key]: next };
    });
  };
  const resetScales = () => setScale(defaultScale);
  const basePxByKey: Record<TunerKey, number> = isMobile
    ? {
        displayName: 18,
        verifiedBadge: 16,
        username: 9,
        bio: 8,
        meta: 8,
        address: 8,
        addressCopy: 12,
        linkIcon: 12,
        linkLabel: 8,
        linkDomain: 7,
        linkMore: 7,
        linkCopy: 12,
        viewProfile: 7,
        avatar: 80,
      }
    : {
        displayName: 20,
        verifiedBadge: 16,
        username: 10,
        bio: 9,
        meta: 9,
        address: 9,
        addressCopy: 12,
        linkIcon: 14,
        linkLabel: 9,
        linkDomain: 8,
        linkMore: 8,
        linkCopy: 12,
        viewProfile: 8,
        avatar: 100,
      };
  const absolutePx = (key: TunerKey) => Number((basePxByKey[key] * scale[key]).toFixed(1));
  const copyTunerValues = async () => {
    const lines = controls.map((control) => `${control.label}: ${scale[control.key].toFixed(2)}x (${absolutePx(control.key)}px)`);
    const payload = [
      "Carousel card tuner values:",
      ...lines,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), 1500);
    } catch {
      setCopyLabel("Failed");
      setTimeout(() => setCopyLabel("Copy"), 1500);
    }
  };
  const layoutStep = 2;
  const adjustLayout = (key: LayoutTunerKey, delta: number) => {
    setLayoutTune((prev) => ({ ...prev, [key]: prev[key] + delta }));
  };
  const resetLayoutTuner = () => {
    setLayoutTune({ headlineY: -64, carouselY: -40 });
  };
  const copyLayoutValues = async () => {
    const payload = [
      "Homepage position tuner values:",
      `headlineY: ${layoutTune.headlineY}px`,
      `carouselY: ${layoutTune.carouselY}px`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopyLayoutLabel("Copied");
      setTimeout(() => setCopyLayoutLabel("Copy"), 1500);
    } catch {
      setCopyLayoutLabel("Failed");
      setTimeout(() => setCopyLayoutLabel("Copy"), 1500);
    }
  };
  const textScaleOverrides: ProfileCardTextScale = {
    displayName: scale.displayName,
    verifiedBadge: scale.verifiedBadge,
    username: scale.username,
    bio: scale.bio,
    meta: scale.meta,
    address: scale.address,
    addressCopy: scale.addressCopy,
    linkIcon: scale.linkIcon,
    linkLabel: scale.linkLabel,
    linkDomain: scale.linkDomain,
    linkMore: scale.linkMore,
    linkCopy: scale.linkCopy,
    viewProfile: scale.viewProfile,
  };
  const typedPrefix = animatedHeadline.slice(0, Math.min(animatedHeadline.length, headlinePrefix.length));
  const typedTail = animatedHeadline.slice(headlinePrefix.length);
  const isTypedProfileClickable = isTypedNameComplete && currentTypedProfileIndex !== null;
  const mobileDownshiftPx = isMobile ? 48 : 0;
  const handleTypedNameClick = () => {
    if (!isTypedProfileClickable || currentTypedProfileIndex === null) return;
    const selectedProfile = profiles[currentTypedProfileIndex];
    if (!selectedProfile) return;
    onCardClick(selectedProfile);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 md:pt-32">
      <div className="mb-10 md:mb-12 text-center" style={{ transform: `translateY(${layoutTune.headlineY + mobileDownshiftPx}px)` }}>
        <h2 className="text-2xl md:text-4xl font-semibold text-gray-900 tracking-tight">
          {typedPrefix}
          <span className="block md:inline min-h-[1.3em]">
            <span
              className={`text-green-700 ${isTypedProfileClickable ? "cursor-pointer hover:underline" : ""}`}
              onMouseEnter={() => {
                if (isTypedNameComplete) setIsNameHoverPaused(true);
              }}
              onMouseLeave={() => setIsNameHoverPaused(false)}
              onClick={handleTypedNameClick}
            >
              {typedTail}
            </span>
            <span className="typing-caret" aria-hidden="true">|</span>
          </span>
        </h2>
      </div>
      <div className="mb-16 mt-2 md:mt-3" style={{ overflowX: "clip", transform: `translateY(${layoutTune.carouselY + mobileDownshiftPx}px)` }}>
        <div
          className="relative flex justify-center items-start h-[400px] md:h-[480px] pt-14 md:pt-20"
          style={{ overflowX: "clip", touchAction: isMobile ? "pan-y" : undefined }}
          onTouchStart={handleCarouselTouchStart}
          onTouchMove={handleCarouselTouchMove}
          onTouchEnd={handleCarouselTouchEnd}
          onTouchCancel={handleCarouselTouchCancel}
        >
          {profiles.map((profile, index) => {
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
                textScaleOverrides={textScaleOverrides}
                avatarScale={scale.avatar}
                onClick={() => handleCardClick(profile)}
              />
            );
          })}
        </div>
      </div>
      {isMobile && profiles.length > 1 && (
        <div
          className="flex justify-center gap-2 mt-2"
        >
          {profiles.map((profile, index) => (
            <button
              key={profile.id ?? `indicator-${index}`}
              onClick={() => setActiveCardIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeCardIndex ? "bg-green-600 w-6" : "bg-gray-300"}`}
            />
          ))}
        </div>
      )}
      {SHOW_LAYOUT_POSITION_TUNER && (
      <div className="max-w-xl mx-auto mt-4 rounded-xl border border-gray-300 bg-white/80 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Homepage Position Tuner</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetLayoutTuner}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={copyLayoutValues}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 min-w-[58px]"
            >
              {copyLayoutLabel}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            { key: "headlineY", label: "headlineY" },
            { key: "carouselY", label: "carouselY" },
          ] as { key: LayoutTunerKey; label: string }[]).map((control) => (
            <div key={control.key} className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5">
              <span className="text-xs text-gray-700">{control.label}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustLayout(control.key, -layoutStep)}
                  className="h-6 w-6 rounded border border-gray-300 text-sm leading-none text-gray-700 hover:bg-gray-50"
                  aria-label={`Move ${control.label} up`}
                >
                  -
                </button>
                <span className="w-24 text-center text-[11px] text-gray-600 tabular-nums">
                  {layoutTune[control.key]}px
                </span>
                <button
                  type="button"
                  onClick={() => adjustLayout(control.key, layoutStep)}
                  className="h-6 w-6 rounded border border-gray-300 text-sm leading-none text-gray-700 hover:bg-gray-50"
                  aria-label={`Move ${control.label} down`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
      {SHOW_TEMP_CARD_TUNER && (
      <div className="max-w-3xl mx-auto mt-4 rounded-xl border border-gray-300 bg-white/80 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Temporary Card Tuner</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetScales}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={copyTunerValues}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 min-w-[58px]"
            >
              {copyLabel}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {controls.map((control) => (
            <div key={control.key} className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-2 py-1.5">
              <span className="text-xs text-gray-700">{control.label}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustScale(control.key, -step)}
                  className="h-6 w-6 rounded border border-gray-300 text-sm leading-none text-gray-700 hover:bg-gray-50"
                  aria-label={`Decrease ${control.label}`}
                >
                  -
                </button>
                <span className="w-28 text-center text-[11px] text-gray-600 tabular-nums">
                  {scale[control.key].toFixed(2)}x | {absolutePx(control.key)}px
                </span>
                <button
                  type="button"
                  onClick={() => adjustScale(control.key, step)}
                  className="h-6 w-6 rounded border border-gray-300 text-sm leading-none text-gray-700 hover:bg-gray-50"
                  aria-label={`Increase ${control.label}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}


interface HomePageProps {
  initialFeaturedProfiles: Profile[];
}

export default function HomePage({ initialFeaturedProfiles }: HomePageProps) {
  const router = useRouter();
  const handleCardClick = useCallback(
    (profile: Profile) => {
      const slug = buildSlug(profile);
      if (slug) router.push(`/${slug}`);
    },
    [router]
  );

  return (
    <div className="flex flex-col min-h-[calc(100dvh-96px)] overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="flex-1 overflow-hidden">
        <FeaturedCardsSection profiles={initialFeaturedProfiles} onCardClick={handleCardClick} />
      </div>
    </div>
  );
}
