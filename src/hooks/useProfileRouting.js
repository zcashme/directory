import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function useProfileRouting(
  profiles,
  selectedAddress,
  setSelectedAddress,
  showDirectory,
  setShowDirectory
) {
  const navigate = useNavigate();

  // unified normalization: underscores instead of spaces
  const norm = (s = "") =>
    s
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, ""); // allow dash

  // Keep URL in sync when a profile is selected
  useEffect(() => {
    if (!profiles.length) return;

    const match = profiles.find((p) => p.address === selectedAddress);
    const currentPathRaw = decodeURIComponent(window.location.pathname.slice(1));
    const currentSlug = norm(currentPathRaw);

    if (match?.name) {
      const nextSlugBase = norm(match.name);
      const nextSlug =
        match.slug ||
        (match.address_verified ? nextSlugBase : `${nextSlugBase}-${match.id}`);
      if (currentSlug !== nextSlug) {
        navigate(`/${nextSlug}`, { replace: false });
      }
    } else if (!currentSlug && showDirectory) {
      navigate("/", { replace: false });
    }
  }, [selectedAddress, profiles, navigate, showDirectory]);

  // React to URL on load or when profiles change
  useEffect(() => {
    const rawPath = decodeURIComponent(window.location.pathname.slice(1)).trim();

    if (!rawPath) {
      setSelectedAddress(null);
      setShowDirectory(true);
      return;
    }

    const slug = rawPath.toLowerCase();

    // 🧩 detect /name-id format
    const matchDash = slug.match(/^(?<base>[a-z0-9_]+)-(?<id>\d+)$/);
    if (matchDash?.groups?.id) {
      const id = parseInt(matchDash.groups.id, 10);
      const profile = profiles.find((p) => p.id === id);
      if (profile) {
        setSelectedAddress(profile.address);
        setShowDirectory(false);
        return;
      }
    }

    // ✅ Exact slug match
    let profile = profiles.find((p) => (p.slug || "").toLowerCase() === slug);

    // ✅ Fallback: normalized name (for verified or legacy)
    if (!profile) {
      const matching = profiles.filter((p) => norm(p.name || "") === norm(slug));
      if (matching.length) {
        // 🥇 Prefer verified
        const verified = matching.find(
          (p) => p.address_verified || p.zcasher_links?.some((l) => l.is_verified)
        );

        if (verified) {
          profile = verified;
        } else {
          // 🕓 No verified? → pick oldest (lowest id)
          profile = matching
            .slice()
            .sort((a, b) => a.id - b.id)[0];

        }
      }
    }

    if (profile) {
      setSelectedAddress(profile.address);
      setShowDirectory(false);
    } else {
      setSelectedAddress(null);
      setShowDirectory(true);
    }
  }, [profiles, setSelectedAddress, setShowDirectory]);
}
