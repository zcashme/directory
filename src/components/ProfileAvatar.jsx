import { useEffect, useState } from "react";

export default function ProfileAvatar({
    profile,
    size = 32, // pixels
    imageClassName = "object-cover",
    className = "",
    showFallbackIcon = false,
    blink = false,
    lookAround = false,
}) {
    // --- derive state ---
    const isVerified =
        profile.address_verified ||
        profile.verified ||
        profile.verified_links_count > 0 ||
        profile.links?.some((l) => l.is_verified);

    let rankType = null;
    if (profile.rank_alltime > 0) rankType = "alltime";
    else if (profile.rank_weekly > 0) rankType = "weekly";
    else if (profile.rank_monthly > 0) rankType = "monthly";
    else if (profile.rank_daily > 0) rankType = "daily";

    // --- background logic (copied faithfully) ---
    let circleClass = "bg-blue-500";

    if (isVerified && rankType) {
        circleClass = "bg-gradient-to-r from-green-400 to-orange-500";
    } else if (isVerified) {
        circleClass = "bg-green-500";
    } else if (rankType) {
        if (rankType === "weekly") {
            circleClass = "bg-gradient-to-r from-blue-500 to-orange-500";
        } else if (rankType === "daily") {
            circleClass = "bg-gradient-to-r from-blue-500 to-cyan-500";
        } else {
            circleClass = "bg-gradient-to-r from-blue-500 to-red-500";
        }
    }

    const gradientStyle = circleClass.includes("bg-gradient-to-r")
        ? {
            backgroundSize: "200% 100%",
            animation: "avatar-gradient-x 4s ease-in-out infinite alternate",
        }
        : {};

    const outerSize = size + 6;

    const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const shouldAnimate = lookAround && !profile.profile_image_url;
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
        let timeoutId = null;

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
    }, [lookAround, profile.profile_image_url]);

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
                className={`relative rounded-full overflow-hidden flex-shrink-0 ${circleClass} ${className}`}
                style={{ width: outerSize, height: outerSize, ...gradientStyle }}
            >
                <div className="absolute inset-[2px] rounded-full overflow-hidden flex items-center justify-center">
                    {profile.profile_image_url ? (
                        <img
                            src={profile.profile_image_url}
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
