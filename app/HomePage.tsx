"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import ProfileHeader from "@/ui/profile/ProfileHeader";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";
import { ProfileCardContent } from "@/ui/profile/ProfileCard";
import { buildSlug } from "@/lib/profile/profileUtils";
import { parseProfileLinks } from "@/lib/profile/profileLinks";

interface FannedCardAvatarProps {
  profile: Profile;
  size: number;
  isHighlighted: boolean;
}

function FannedCardAvatar({ profile, size, isHighlighted }: FannedCardAvatarProps) {
  return (
    <div className={`absolute ${size === 80 ? "-top-10" : "-top-12"} left-1/2 -translate-x-1/2 z-20`}>
      <div className="rounded-full border border-black p-0.5 bg-transparent" style={{ transform: isHighlighted ? "scale(1.1)" : "scale(1)", transition: "transform 0.3s ease-out" }}>
        <div className="[&>div]:!bg-transparent [&>div]:!border-0">
          <ProfileAvatar profile={profile} size={size} imageClassName="object-cover" className="shadow-lg" />
        </div>
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
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  shimmerSpeed?: string;
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
  onInteractionStart,
  onInteractionEnd,
  shimmerSpeed = "",
}: FannedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const { linksArray } = parseProfileLinks(profile);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
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
    onInteractionStart?.();
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    onInteractionEnd?.();
  };
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
        <FannedCardAvatar profile={profile} size={80} isHighlighted={isActive} />
        <div
          className={`w-[240px] rounded-2xl border border-gray-500 p-4 pt-16 shadow-xl text-center flex flex-col relative ${isActive && shimmerSpeed ? "card-shimmer" : ""}`}
          style={{
            backgroundColor: 'var(--color-background)',
            minHeight: '360px',
            maxHeight: '400px',
            transform: isActive ? "scale(1)" : "scale(0.98)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isActive
              ? "0 25px 50px -12px rgba(34, 197, 94, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.2)"
              : "0 5px 15px -5px rgba(0, 0, 0, 0.15)",
          }}
        >
          <ProfileCardContent profile={profile} linksArray={linksArray} variant="mobile" linkVariant="simple" hideLinkBadges={true} />
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
      <FannedCardAvatar profile={profile} size={100} isHighlighted={isHighlighted} />
      <div
        className={`w-[280px] rounded-2xl border border-gray-500 p-5 pt-20 text-center shadow-2xl flex flex-col relative ${isSpotlit && !isHovering && shimmerSpeed ? "card-shimmer" : ""}`}
        style={{
          backgroundColor: 'var(--color-background)',
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
        <ProfileCardContent profile={profile} linksArray={linksArray} variant="default" linkVariant="simple" hideLinkBadges={true} />
      </div>
    </div>
  );
}

interface FeaturedCardsSectionProps {
  profiles: Profile[];
  onCardClick: (profile: Profile) => void;
}

function FeaturedCardsSection({ profiles, onCardClick }: FeaturedCardsSectionProps) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  const centerIndex = Math.floor(profiles.length / 2);

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
    if (profiles.length <= 1 || isInteracting) return;
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % profiles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [profiles.length, isInteracting]);

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

  const handleCardClick = (profile: Profile) => {
    onCardClick(profile);
  };

  return (
    <div className="max-w-7xl mx-auto mb-12 md:mb-16 px-4 pt-40">
      <div className="mb-16" style={{ overflowX: "clip" }}>
        <div className="relative flex justify-center items-start h-[400px] md:h-[480px] pt-14 md:pt-20" style={{ overflowX: "clip" }}>
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
                onInteractionStart={() => setIsInteracting(true)}
                onInteractionEnd={() => setIsInteracting(false)}
                onClick={() => handleCardClick(profile)}
              />
            );
          })}
        </div>
        {isMobile && profiles.length > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {profiles.map((profile, index) => (
              <button
                key={profile.id ?? `indicator-${index}`}
                onClick={() => setActiveCardIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeCardIndex ? "bg-green-600 w-6" : "bg-gray-300"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SocialLink {
  href: string;
  label: string;
  path: string;
  evenodd: boolean;
}

const SOCIAL_LINKS: SocialLink[] = [
  { href: "https://x.com/zcashme", label: "X (Twitter)", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z", evenodd: false },
  { href: "https://discord.gg/zcashme", label: "Discord", path: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.29-.444.67-.608 1.06a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.06.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z", evenodd: false },
  { href: "https://github.com/zcashme", label: "GitHub", path: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.464-1.178-1.132-1.49-1.132-1.49-.927-.634.07-.622.07-.622 1.025.072 1.564 1.032 1.564 1.032.91 1.56 2.384 1.088 2.96.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z", evenodd: true },
];

interface HomePageProps {
  initialFeaturedProfiles: Profile[];
  profileCount?: number;
}

export default function HomePage({ initialFeaturedProfiles, profileCount = 0 }: HomePageProps) {
  const router = useRouter();
  const handleCardClick = useCallback(
    (profile: Profile) => {
      const slug = buildSlug(profile);
      if (slug) router.push(`/${slug}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="flex-1">
        <ProfileHeader profileCount={profileCount} />
        <FeaturedCardsSection profiles={initialFeaturedProfiles} onCardClick={handleCardClick} />
      </div>
      <footer className="mt-auto py-8 border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-center items-center gap-6 relative">
            {SOCIAL_LINKS.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={link.label}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path {...(link.evenodd && { fillRule: "evenodd", clipRule: "evenodd" })} d={link.path} />
                </svg>
              </motion.a>
            ))}
            <div className="absolute right-0 flex flex-col gap-0.5 text-xs text-gray-500">
              <Link href="/terms" className="hover:text-gray-600 transition-colors leading-relaxed">Terms</Link>
              <Link href="/privacy" className="hover:text-gray-600 transition-colors leading-relaxed">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
