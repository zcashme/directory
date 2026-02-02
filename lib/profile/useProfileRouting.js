"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function useProfileRouting(
  profiles,
  selectedAddress,
  setSelectedAddress,
  showDirectory,
  setShowDirectory
) {
  const router = useRouter();
  const pathname = usePathname();

  // Utility: normalize names into slug-like strings
  const norm = (s = "") =>
    s
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_-]/g, ""); // allow dash

  // EFFECT 1 - Selected Profile -> URL Slug Sync
  useEffect(() => {
    if (!profiles.length) {
      return;
    }

    if (showDirectory) {
      return;
    }

    // Find profile corresponding to selectedAddress
    const match = profiles.find((p) => p.address === selectedAddress);

    const currentPathRaw = decodeURIComponent((pathname || "/").slice(1));
    const currentSlug = norm(currentPathRaw);

    if (!match?.name) {
      return;
    }

    // Build the correct slug for the selected profile
    const nextSlugBase = norm(match.name);
    const nextSlug =
      match.slug ||
      (match.address_verified ? nextSlugBase : `${nextSlugBase}-${match.id}`);

    if (currentSlug === nextSlug) {
      return;
    }

    router.push(`/${nextSlug}`);
  }, [selectedAddress, profiles, router, showDirectory, pathname]);

  // EFFECT 2 - URL -> Determine Active Profile
  useEffect(() => {
    if (window.lastSelectionWasExplicit) {
      window.lastSelectionWasExplicit = false;
      return;
    }

    const rawPath = decodeURIComponent((pathname || "/").slice(1)).trim();

    // If URL is "/", show the directory
    if (!rawPath) {
      setSelectedAddress(null);
      setShowDirectory(true);
      return;
    }

    const slug = rawPath.toLowerCase();

    // Case 1: /name-id format (unverified profiles)
    const matchDash = slug.match(/^(?<base>[a-z0-9_]+)-(?<id>\d+)$/);
    if (matchDash?.groups?.id) {
      const id = parseInt(matchDash.groups.id, 10);
      const profileFromId = profiles.find((p) => p.id === id);

      if (profileFromId) {
        setSelectedAddress(profileFromId.address);
        setShowDirectory(false);
        return;
      }
    }

    // Case 2: Exact slug match (verified profiles or custom slugs)
    let profile = profiles.find((p) => (p.slug || "").toLowerCase() === slug);

    // Case 3: Ambiguous name -> apply fallback rules
    if (!profile) {
      const matching = profiles.filter((p) => norm(p.name || "") === norm(slug));

      if (matching.length) {
        const verified = matching.find(
          (p) => p.address_verified || p.zcasher_links?.some((l) => l.is_verified)
        );

        if (verified) {
          profile = verified;
        } else {
          const oldest = matching.slice().sort((a, b) => a.id - b.id)[0];
          profile = oldest;
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
  }, [profiles, setSelectedAddress, setShowDirectory, pathname]);
}
