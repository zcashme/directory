export default function ProfileAvatar({
    profile,
    size = 32, // pixels
    imageClassName = "object-cover",
    className = "",
    showFallbackIcon = false,
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

    return (
        <>
            <style>{`
                @keyframes avatar-gradient-x {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }
            `}</style>
            <div
                className={`relative rounded-full overflow-hidden flex-shrink-0 ${circleClass} ${className}`}
                style={{ width: size, height: size, ...gradientStyle }}
            >
                {profile.profile_image_url && (
                    <img
                        src={profile.profile_image_url}
                        alt={profile.name || "Profile"}
                        className={`absolute inset-0 w-full h-full ${imageClassName}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                )}
                {!profile.profile_image_url && showFallbackIcon && (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-10 h-10 text-blue-700 opacity-20"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    />
                )}
            </div>
        </>
    );
}
