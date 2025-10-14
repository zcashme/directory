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

  const norm = (s = "") => s.normalize("NFKC").trim().toLowerCase();

  // Keep URL in sync when a profile is selected
  useEffect(() => {
    if (!profiles.length) return;

    const match = profiles.find((p) => p.address === selectedAddress);
    const currentPathRaw = decodeURIComponent(window.location.pathname.slice(1));
    const currentSlug = norm(currentPathRaw);

    if (match?.name) {
      const nextSlug = norm(match.name);
      if (currentSlug !== nextSlug) {
        // keep slug human-readable (emojis stay visible)
        navigate(`/${match.name.normalize("NFKC").trim().toLowerCase()}`, { replace: false });
      }
    } else if (!currentSlug && showDirectory) {
      navigate("/", { replace: false });
    }
  }, [selectedAddress, profiles, navigate, showDirectory]);

  // React to URL on load or when profiles change
  useEffect(() => {
    const rawPath = decodeURIComponent(window.location.pathname.slice(1)).trim();

    // homepage -> open directory, clear selection
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
      // unknown slug -> show directory, do not auto-select admin
      setSelectedAddress(null);
      setShowDirectory(true);
    }
  }, [profiles, setSelectedAddress, setShowDirectory]);
}
