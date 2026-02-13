import { useEffect, useState } from "react";
import type { Profile } from "@/lib/profile/types";

interface ProfileAvatarProps {
  profile: Partial<Profile>;
  size?: number;
  imageClassName?: string;
  className?: string;
  blink?: boolean;
  lookAround?: boolean;
}

export default function ProfileAvatar({
  profile,
  size = 32,
  imageClassName = "object-cover",
  className = "",
  blink = true,
  lookAround = true,
}: ProfileAvatarProps) {
  const outerSize = size + 6;

  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const avatarUrl =
    (profile.profile_image_url || profile.avatar_url)?.trim() || "";

  useEffect(() => {
    const shouldAnimate = lookAround && !avatarUrl;
    if (!shouldAnimate) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }

    const offsets = [
      { x: -2, y: 0 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: -2, y: -2 },
      { x: 2, y: -2 },
    ];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      const delay = 5000 + Math.floor(Math.random() * 4000);
      timeoutId = setTimeout(() => {
        setEyeOffset((prev) => {
          let next = prev;
          while (next.x === prev.x && next.y === prev.y && offsets.length > 1) {
            next = offsets[Math.floor(Math.random() * offsets.length)];
          }
          return next;
        });
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lookAround, avatarUrl]);

  return (
    <>
      <style>{`
                @keyframes avatar-gradient-x {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }
                @keyframes avatar-blink {
                    0%, 92%, 100% { transform: scaleY(1); }
                    94%, 96% { transform: scaleY(0.1); }
                }
                .avatar-eyes {
                    transform-origin: center;
                    transform-box: fill-box;
                }
                .avatar-blink {
                    animation: avatar-blink 5s infinite;
                }
            `}</style>
      <div
        className={`relative rounded-full overflow-hidden shrink-0 border border-black bg-transparent ${className}`}
        style={{ width: outerSize, height: outerSize }}
      >
        <div className="absolute inset-[2px] rounded-full overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={profile.name || "Profile"}
              className={`w-full h-full ${imageClassName}`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <svg viewBox="0 0 64 64" aria-hidden="true" className="w-full h-full">
              <g transform={`translate(${eyeOffset.x} ${eyeOffset.y})`}>
                <g className={`avatar-eyes ${blink ? "avatar-blink" : ""}`}>
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
