import { useEffect, useState } from "react";
import Image from "next/image";
import type { Profile } from "@/lib/profile/types";

interface ProfileAvatarProps {
  profile: Partial<Profile>;
  size?: number;
  imageClassName?: string;
  className?: string;
  blink?: boolean;
  lookAround?: boolean;
}

// Random eye positions the smiley can glance toward
const EYE_OFFSETS = [
  { x: -2, y: 0 },
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: -2, y: -2 },
  { x: 2, y: -2 },
];

function pickRandom(offsets: typeof EYE_OFFSETS, current: { x: number; y: number }) {
  let next = current;
  while (next.x === current.x && next.y === current.y && offsets.length > 1) {
    next = offsets[Math.floor(Math.random() * offsets.length)];
  }
  return next;
}

/**
 * Profile avatar — shows user image, or a blinking/glancing smiley SVG fallback.
 */
export default function ProfileAvatar({
  profile,
  size = 32,
  imageClassName = "object-cover",
  className = "",
  blink = true,
  lookAround = true,
}: ProfileAvatarProps) {
  const outerSize = size + 6; // border + padding
  const avatarUrl = (profile.profile_image_url || profile.avatar_url)?.trim() || "";
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  // Randomly shift eyes every 5-9s when no avatar image is set
  useEffect(() => {
    if (!lookAround || avatarUrl) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 5000 + Math.random() * 4000;
      timeoutId = setTimeout(() => {
        setEyeOffset((prev) => pickRandom(EYE_OFFSETS, prev));
        schedule();
      }, delay);
    };
    schedule();

    return () => clearTimeout(timeoutId);
  }, [lookAround, avatarUrl]);

  return (
    <>
      {/* Blink keyframe: eyes squish briefly every 5s */}
      <style>{`
        @keyframes avatar-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          94%, 96% { transform: scaleY(0.1); }
        }
      `}</style>

      <div
        className={`relative rounded-full overflow-hidden shrink-0 border border-black bg-[var(--color-background)] ${className}`}
        style={{ width: outerSize, height: outerSize }}
      >
        <div className="absolute inset-[2px] rounded-full overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile.name || "Profile"}
              width={size}
              height={size}
              className={`w-full h-full ${imageClassName}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            /* Smiley face fallback: two eyes + curved mouth */
            <svg viewBox="0 0 64 64" aria-hidden="true" className="w-full h-full">
              <g transform={`translate(${eyeOffset.x} ${eyeOffset.y})`}>
                <g
                  style={{ transformOrigin: "center", transformBox: "fill-box" as any }}
                  className={blink ? "animate-[avatar-blink_5s_infinite]" : ""}
                >
                  <circle cx="24" cy="26" r="4" fill="rgba(0,0,0,0.65)" />
                  <circle cx="40" cy="26" r="4" fill="rgba(0,0,0,0.65)" />
                </g>
              </g>
              <path
                d="M24 40c3 4 13 4 16 0"
                stroke="rgba(0,0,0,0.65)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )}
        </div>
      </div>
    </>
  );
}
