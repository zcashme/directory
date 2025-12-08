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

  // -------------------------------------------------------------
  // Utility: Normalize names into slug-like strings
  // -------------------------------------------------------------
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

  // ========================================================================
  // EFFECT 1 — “Selected Profile → URL Slug Sync”
  // ========================================================================
  //
  // This effect runs whenever:
  //   - selectedAddress changes
  //   - profiles finish loading
  //
  // Its single responsibility:
  //   → If we have a selected profile, ensure the URL slug matches it.
  //
  // Effect 1 MUST NOT:
  //   - choose which profile the URL refers to
  //   - resolve fallback rules
  //   - show or hide the directory
  //   - navigate("/") automatically
  //
  // ========================================================================
  useEffect(() => {
    console.log(
      "%c[ROUTING 1] fired",
      "color:cyan",
      {
        selectedAddress,
        profilesLen: profiles.length,
        showDirectory,
        path: window.location.pathname,
        lastSelectionWasExplicit: window.lastSelectionWasExplicit ?? false,
      }
    );

    if (!profiles.length) {
      console.log("%c[ROUTING 1] no profiles → exit", "color:cyan");
      return;
    }

    // Find profile corresponding to selectedAddress
    const match = profiles.find((p) => p.address === selectedAddress);
    console.log(
      "%c[ROUTING 1] match for selectedAddress:",
      "color:cyan",
      safeProfile(match)
    );

    const currentPathRaw = decodeURIComponent(
      window.location.pathname.slice(1)
    );
    const currentSlug = norm(currentPathRaw);
    console.log("%c[ROUTING 1] currentSlug:", "color:cyan", currentSlug);

    // If no valid profile is selected, Effect 1 should do nothing.
    if (!match?.name) {
      console.log(
        "%c[ROUTING 1] no match.name → no URL change",
        "color:cyan"
      );
      return;
    }

    // Build the correct slug for the selected profile
    const nextSlugBase = norm(match.name);
    const nextSlug =
      match.slug ||
      (match.address_verified
        ? nextSlugBase
        : `${nextSlugBase}-${match.id}`);

    console.log(
      "%c[ROUTING 1] computed nextSlug:",
      "color:cyan",
      nextSlug
    );

    // If URL already matches the expected slug, no navigation needed
    if (currentSlug === nextSlug) {
      console.log(
        "%c[ROUTING 1] slug already correct → no navigate",
        "color:cyan"
      );
      return;
    }

    // Navigate to the selected profile’s slug
    console.log(
      "%c[ROUTING 1] navigate() to slug",
      "color:cyan;font-weight:bold",
      `/${nextSlug}`
    );
    navigate(`/${nextSlug}`, { replace: false });
  }, [selectedAddress, profiles, navigate, showDirectory]);

  // ========================================================================
  // EFFECT 2 — “URL → Determine Active Profile”
  // ========================================================================
  //
  // This effect runs when:
  //   - URL changes
  //   - profiles load
  //
  // Its job is the inverse of Effect 1:
  //   → Read the URL slug and decide which profile should be selected.
  //
  // Handles:
  //   - /name-id exact routes
  //   - exact slug matches
  //   - fallback rules for ambiguous slugs:
  //         prefer verified → else oldest ID
  //
  // IMPORTANT:
  // If user explicitly clicked a card (directory or dropdown),
  //   window.lastSelectionWasExplicit = true
  // is set — in which case Effect 2 must *not* override that selection.
  //
  // ========================================================================
  useEffect(() => {
    console.log(
      "%c[ROUTING 2] fired",
      "color:yellow",
      {
        path: window.location.pathname,
        profilesLen: profiles.length,
        lastSelectionWasExplicit: window.lastSelectionWasExplicit ?? false,
      }
    );

    // ✅ Do NOT override a deliberate user click on a profile card
    if (window.lastSelectionWasExplicit) {
      console.log(
        "%c[ROUTING 2] SKIP FALLBACK (explicit selection detected)",
        "color:lime;font-weight:bold"
      );
      window.lastSelectionWasExplicit = false;
      return;
    }

    const rawPath = decodeURIComponent(
      window.location.pathname.slice(1)
    ).trim();
    console.log(
      "%c[ROUTING 2] rawPath:",
      "color:yellow",
      JSON.stringify(rawPath)
    );

    // If URL is "/", show the directory
    if (!rawPath) {
      console.log(
        "%c[ROUTING 2] empty rawPath → show directory",
        "color:orange"
      );
      setSelectedAddress(null);
      setShowDirectory(true);
      return;
    }

    const slug = rawPath.toLowerCase();
    console.log("%c[ROUTING 2] slug:", "color:yellow", slug);

    // -------------------------------------------------------------
    // Case 1: /name-id format (unverified profiles)
    // -------------------------------------------------------------
    const matchDash = slug.match(/^(?<base>[a-z0-9_]+)-(?<id>\d+)$/);
    if (matchDash?.groups?.id) {
      const id = parseInt(matchDash.groups.id, 10);
      const profileFromId = profiles.find((p) => p.id === id);
      console.log(
        "%c[ROUTING 2] dash-match id:",
        "color:yellow",
        id,
        "profile:",
        safeProfile(profileFromId)
      );

      if (profileFromId) {
        setSelectedAddress(profileFromId.address);
        setShowDirectory(false);
        console.log(
          "%c[ROUTING 2] using dash-match profile → setSelectedAddress + hide directory",
          "color:lime"
        );
        return;
      }
    }

    // -------------------------------------------------------------
    // Case 2: Exact slug match (verified profiles or custom slugs)
    // -------------------------------------------------------------
    let profile = profiles.find(
      (p) => (p.slug || "").toLowerCase() === slug
    );
    console.log(
      "%c[ROUTING 2] exact slug match:",
      "color:yellow",
      safeProfile(profile)
    );

    // -------------------------------------------------------------
    // Case 3: Ambiguous name → apply fallback rules:
    //         - prefer verified
    //         - else oldest
    // -------------------------------------------------------------
    if (!profile) {
      const matching = profiles.filter(
        (p) => norm(p.name || "") === norm(slug)
      );
      console.log(
        "%c[ROUTING 2] name-based matches:",
        "color:yellow",
        matching.map(safeProfile)
      );

      if (matching.length) {
        const verified = matching.find(
          (p) =>
            p.address_verified ||
            p.zcasher_links?.some((l) => l.is_verified)
        );

        if (verified) {
          console.log(
            "%c[ROUTING 2] chose VERIFIED profile",
            "color:yellow;font-weight:bold",
            safeProfile(verified)
          );
          profile = verified;
        } else {
          const oldest = matching
            .slice()
            .sort((a, b) => a.id - b.id)[0];
          console.log(
            "%c[ROUTING 2] chose OLDEST profile",
            "color:yellow;font-weight:bold",
            safeProfile(oldest)
          );
          profile = oldest;
        }
      }
    }

    // -------------------------------------------------------------
    // Final resolution
    // -------------------------------------------------------------
    if (profile) {
      console.log(
        "%c[ROUTING 2] final profile → setSelectedAddress + hide directory",
        "color:lime",
        safeProfile(profile)
      );
      setSelectedAddress(profile.address);
      setShowDirectory(false);
    } else {
      console.log(
        "%c[ROUTING 2] no profile match → show directory",
        "color:red;font-weight:bold"
      );
      setSelectedAddress(null);
      setShowDirectory(true);
    }
  }, [profiles, setSelectedAddress, setShowDirectory]);
}
