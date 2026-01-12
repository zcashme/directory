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

  // Small helper for compact, readable logging
  const safeProfile = (p) =>
    p
      ? {
          id: p.id,
          name: p.name,
          slug: p.slug,
          address: p.address,
          address_verified: p.address_verified,
        }
      : null;

  // EFFECT 1 - Selected Profile -> URL Slug Sync
  useEffect(() => {
    console.log("[ROUTING 1] fired", {
      selectedAddress,
      profilesLen: profiles.length,
      showDirectory,
      path: pathname,
      lastSelectionWasExplicit: window.lastSelectionWasExplicit ?? false,
    });

    if (!profiles.length) {
      console.log("[ROUTING 1] no profiles -> exit");
      return;
    }

    if (showDirectory) {
      console.log("[ROUTING 1] directory open -> skip URL sync");
      return;
    }

    // Find profile corresponding to selectedAddress
    const match = profiles.find((p) => p.address === selectedAddress);
    console.log("[ROUTING 1] match for selectedAddress:", safeProfile(match));

    const currentPathRaw = decodeURIComponent((pathname || "/").slice(1));
    const currentSlug = norm(currentPathRaw);
    console.log("[ROUTING 1] currentSlug:", currentSlug);

    if (!match?.name) {
      console.log("[ROUTING 1] no match.name -> no URL change");
      return;
    }

    // Build the correct slug for the selected profile
    const nextSlugBase = norm(match.name);
    const nextSlug =
      match.slug ||
      (match.address_verified ? nextSlugBase : `${nextSlugBase}-${match.id}`);

    console.log("[ROUTING 1] computed nextSlug:", nextSlug);

    if (currentSlug === nextSlug) {
      console.log("[ROUTING 1] slug already correct -> no navigate");
      return;
    }

    console.log("[ROUTING 1] navigate() to slug", `/${nextSlug}`);
    router.push(`/${nextSlug}`);
  }, [selectedAddress, profiles, router, showDirectory, pathname]);

  // EFFECT 2 - URL -> Determine Active Profile
  useEffect(() => {
    console.log("[ROUTING 2] fired", {
      path: pathname,
      profilesLen: profiles.length,
      lastSelectionWasExplicit: window.lastSelectionWasExplicit ?? false,
    });

    if (window.lastSelectionWasExplicit) {
      console.log("[ROUTING 2] SKIP FALLBACK (explicit selection detected)");
      window.lastSelectionWasExplicit = false;
      return;
    }

    const rawPath = decodeURIComponent((pathname || "/").slice(1)).trim();
    console.log("[ROUTING 2] rawPath:", JSON.stringify(rawPath));

    // If URL is "/", show the directory
    if (!rawPath) {
      console.log("[ROUTING 2] empty rawPath -> show directory");
      setSelectedAddress(null);
      setShowDirectory(true);
      return;
    }

    const slug = rawPath.toLowerCase();
    console.log("[ROUTING 2] slug:", slug);

    // Case 1: /name-id format (unverified profiles)
    const matchDash = slug.match(/^(?<base>[a-z0-9_]+)-(?<id>\d+)$/);
    if (matchDash?.groups?.id) {
      const id = parseInt(matchDash.groups.id, 10);
      const profileFromId = profiles.find((p) => p.id === id);
      console.log("[ROUTING 2] dash-match id:", id, "profile:", safeProfile(profileFromId));

      if (profileFromId) {
        setSelectedAddress(profileFromId.address);
        setShowDirectory(false);
        console.log("[ROUTING 2] using dash-match profile -> setSelectedAddress + hide directory");
        return;
      }
    }

    // Case 2: Exact slug match (verified profiles or custom slugs)
    let profile = profiles.find((p) => (p.slug || "").toLowerCase() === slug);
    console.log("[ROUTING 2] exact slug match:", safeProfile(profile));

    // Case 3: Ambiguous name -> apply fallback rules
    if (!profile) {
      const matching = profiles.filter((p) => norm(p.name || "") === norm(slug));
      console.log("[ROUTING 2] name-based matches:", matching.map(safeProfile));

      if (matching.length) {
        const verified = matching.find(
          (p) => p.address_verified || p.zcasher_links?.some((l) => l.is_verified)
        );

        if (verified) {
          console.log("[ROUTING 2] chose VERIFIED profile", safeProfile(verified));
          profile = verified;
        } else {
          const oldest = matching.slice().sort((a, b) => a.id - b.id)[0];
          console.log("[ROUTING 2] chose OLDEST profile", safeProfile(oldest));
          profile = oldest;
        }
      }
    }

    if (profile) {
      console.log("[ROUTING 2] final profile -> setSelectedAddress + hide directory", safeProfile(profile));
      setSelectedAddress(profile.address);
      setShowDirectory(false);
    } else {
      console.log("[ROUTING 2] no profile match -> show directory");
      setSelectedAddress(null);
      setShowDirectory(true);
    }
  }, [profiles, setSelectedAddress, setShowDirectory, pathname]);
}
