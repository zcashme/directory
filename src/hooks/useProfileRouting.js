import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_ADDRESS } from "../DirectoryConstants";

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
      .replace(/[^a-z0-9_]/g, "");

  // Keep URL in sync when a profile is selected
  useEffect(() => {
    if (!profiles.length) return;

    const match = profiles.find((p) => p.address === selectedAddress);
    const currentPathRaw = decodeURIComponent(window.location.pathname.slice(1));
    const currentSlug = norm(currentPathRaw);

    if (match?.name) {
      const nextSlug = norm(match.name);
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

    const slug = norm(rawPath);
    const profile = profiles.find((p) => norm(p.name || "") === slug);

    if (profile) {
      setSelectedAddress(profile.address);
      setShowDirectory(false);
    } else {
      setSelectedAddress(null);
      setShowDirectory(true);
    }
  }, [profiles, setSelectedAddress, setShowDirectory]);
}
