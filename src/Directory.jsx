import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ZcashGridButton from "./components/ZcashGridButton";

import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
// import Toast from "./Toast";
// import useToastMessage from "./hooks/useToastMessage";

import ProfileCard from "./components/ProfileCard";
import ProfileSearchDropdown from "./components/ProfileSearchDropdown";

import LetterGridModal from "./components/LetterGridModal";
import AlphabetSidebar from "./components/AlphabetSidebar";

import useProfiles from "./hooks/useProfiles";
import useProfileRouting from "./hooks/useProfileRouting";
import useAlphaVisibility from "./hooks/useAlphaVisibility";
import useDirectoryVisibility from "./hooks/useDirectoryVisibility";

import computeGoodThru from "./utils/computeGoodThru";
import { useFeedback } from "./hooks/useFeedback";

import bookOpen from "./assets/book-open.svg";
import bookClosed from "./assets/book-closed.svg";

export default function Directory() {
  const navigate = useNavigate();
  const { setSelectedAddress, selectedAddress } = useFeedback();

  const { profiles, loading, addProfile } = useProfiles();
  const { showDirectory, setShowDirectory } = useDirectoryVisibility();
  const showAlpha = useAlphaVisibility(showDirectory);
  // const { toastMsg, showToast, closeToast } = useToastMessage();
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // multi-filter state
  const [filters, setFilters] = useState({
    verified: false,
    referred: false,
    ranked: false,
    featured: true, // default to featured profiles
  });

  const searchBarRef = useRef(null);

  useProfileRouting(
    profiles,
    selectedAddress,
    setSelectedAddress,
    showDirectory,
    setShowDirectory
  );




  // compute referrals (RefRank)
  const { rankedProfiles } = useMemo(() => {
    const norm = (s) =>
      (s || "")
        .toString()
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/ /g, "_")
        .replace(/[^a-z0-9_]/g, "");

    const idByIdentity = new Map();
    const metaById = new Map();
    profiles.forEach((p) => {
      const nName = norm(p.name);
      if (nName) idByIdentity.set(nName, p.id);
      const nSlug = norm(p.slug);
      if (nSlug) idByIdentity.set(nSlug, p.id);
      const joinDate = p.joined_at || p.created_at || p.since || null;
      metaById.set(p.id, { since: joinDate, name: p.name || "" });
    });

    const countsById = new Map();
    profiles.forEach((p) => {
      const ref = norm(p.referred_by);
      if (!ref) return;
      const refId = idByIdentity.get(ref);
      if (!refId) return;
      countsById.set(refId, (countsById.get(refId) || 0) + 1);
    });

    const sorted = Array.from(countsById.entries()).sort(
      ([idA, cA], [idB, cB]) => {
        if (cB !== cA) return cB - cA;
        const a = metaById.get(idA) || {};
        const b = metaById.get(idB) || {};
        const aSince = a.since
          ? new Date(a.since).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bSince = b.since
          ? new Date(b.since).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (aSince !== bSince) return aSince - bSince;
        const aName = (a.name || "").toLowerCase();
        const bName = (b.name || "").toLowerCase();
        return aName.localeCompare(bName);
      }
    );

    const rankById = new Map();
    sorted.slice(0, 10).forEach(([id], idx) => rankById.set(id, idx + 1));

    const countsByIdentity = {};
    idByIdentity.forEach((id, ident) => {
      const c = countsById.get(id) || 0;
      if (c > 0) countsByIdentity[ident] = c;
    });

    const enriched = profiles.map((p) => {
      const verifiedLinks =
        p.verified_links_count ??
        (p.links?.filter((l) => l.is_verified).length || 0);
      const verifications = (p.address_verified ? 1 : 0) + verifiedLinks;
      const refRank = rankById.get(p.id) || 0;

      return {
        ...p,
        verifications,
        refRank,
        referral_rank: refRank || p.referral_rank || 0, // 🟠 ensure backward-compatible rank field
        featured: p.featured === true,
      };
    });


    return { referralCounts: countsByIdentity, rankedProfiles: enriched };
  }, [profiles]);

  const processedProfiles = rankedProfiles;

  const selectedProfile = useMemo(() => {
    const match = processedProfiles.find(
      (p) => p.address === selectedAddress
    );
    if (!match) return null;
    const joinedAt = match.joined_at || match.created_at || match.since || null;
    const good_thru = computeGoodThru(joinedAt, match.last_signed_at);
    return { ...match, good_thru };
  }, [processedProfiles, selectedAddress]);

  // ✅ Keep feedback form in sync with the active profile (for /:username route)
  // ✅ Keep feedback form in sync with the active profile (for /:username route)
  useEffect(() => {
    if (selectedProfile?.address) {
      setSelectedAddress(selectedProfile.address);

      // 🪪 Dev-only log to confirm the sync link
      if (import.meta.env.DEV) {
        console.log(
          `🪪 Feedback linked to ${selectedProfile.name || "(unknown)"} (zId: ${selectedProfile.id
          })`
        );
      }
    }
  }, [selectedProfile?.address, selectedProfile?.id, selectedProfile?.name, setSelectedAddress]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!dropdownRef.current) return;
      if (!searchInputRef.current) return;

      const insideDropdown = dropdownRef.current.contains(e.target);
      const insideInput = searchInputRef.current.contains(e.target);

      if (!insideDropdown && !insideInput) {
        // Previously this cleared the search and reset the directory.
        // That’s why your filter disappears when you click any card.
        console.log(
          "[DIR] clickOutside search - NOT clearing search anymore. target:",
          e.target
        );
        // setSearch(""); // ← removed to keep search filter when clicking cards
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // filter + grouping logic
  const { sorted, grouped, letters } = useMemo(() => {
    let s = [...processedProfiles].filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    const { verified, referred, ranked, featured } = filters;

    if (verified) {
      s = s.filter((p) => p.address_verified || (p.verifications ?? 0) > 0);
    }
    if (referred) {
      s = s.filter((p) => !!p.referred_by);
    }
    // Defining who appears under Ranked filter (top 10 in any leaderboard period)
    if (ranked) {
      s = s.filter((p) => {
        const allRank = Number(p.rank_alltime) || 0;
        const weekRank = Number(p.rank_weekly) || 0;
        const monthRank = Number(p.rank_monthly) || 0;
        return (
          (allRank > 0 && allRank <= 10) ||
          (weekRank > 0 && weekRank <= 10) ||
          (monthRank > 0 && monthRank <= 10)
        );
      });
    }


    if (featured) {
      s = s.filter((p) => Boolean(p.featured) === true);
    }

    s.sort((a, b) => a.name.localeCompare(b.name));

    const g = s.reduce((acc, p) => {
      const first = p.name?.[0]?.toUpperCase() || "#";
      (acc[first] ||= []).push(p);
      return acc;
    }, {});
    const L = Object.keys(g).sort();

    return { sorted: s, grouped: g, letters: L };
  }, [processedProfiles, search, filters]);

  const [showLetterGrid, setShowLetterGrid] = useState(false);

  const scrollToLetter = (letter) => {
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 70;
      window.scrollTo({ top: offset, behavior: "smooth" });
      setActiveLetter(letter);
      clearTimeout(scrollToLetter._t);
      scrollToLetter._t = setTimeout(() => setActiveLetter(null), 600);
    }
  };

  const handleGridSelect = (letter) => {
    setShowLetterGrid(false);
    setTimeout(() => scrollToLetter(letter), 200);
  };

  const toggleFilter = (key) => {
    setFilters((prev) => {
      const next = { verified: false, referred: false, ranked: false, featured: false };
      // If clicking an already active filter → deselect all
      if (prev[key]) return next;
      // Otherwise, activate only the chosen one
      next[key] = true;
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ verified: false, referred: false, ranked: false });
  };

  const anyFilterActive = Object.values(filters).some(Boolean);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center mt-20 space-y-4">
        <div className="flex space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 animate-twinkle"></span>
          <span className="w-3 h-3 rounded-full bg-green-500 animate-twinkle delay-150"></span>
          <span className="w-3 h-3 rounded-full bg-orange-500 animate-twinkle delay-300"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-400 animate-twinkle delay-500"></span>
        </div>
        <p className="text-sm text-gray-500 font-medium tracking-wide">
          Loading directory…
        </p>
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.3); }
          }
          .animate-twinkle {
            animation: twinkle 1.4s ease-in-out infinite;
          }
        `}</style>
      </div>
    );

  return (
    <>
      <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-20">


        {showDirectory && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <div className="flex items-center flex-wrap gap-2">
                {/* Filter toggles */}
                {/* Featured */}
                <button
                  onClick={() => toggleFilter("featured")}
                  className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${filters.featured
                    ? "bg-yellow-400 text-yellow-900 border-yellow-500 shadow-sm"
                    : "bg-transparent text-yellow-700 border-yellow-400 hover:bg-yellow-50"
                    }`}
                >
                  ⭐ Featured ({processedProfiles.filter((p) => p.featured).length})
                </button>

                {/* Ranked */}
                <button
                  onClick={() => toggleFilter("ranked")}
                  className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${filters.ranked
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-transparent text-orange-700 border-orange-400 hover:bg-orange-50"
                    }`}
                >
                  🔥 Top Rank ({processedProfiles.filter((p) => {
                    const allRank = Number(p.rank_alltime) || 0;
                    const weekRank = Number(p.rank_weekly) || 0;
                    const monthRank = Number(p.rank_monthly) || 0;
                    return (
                      (allRank > 0 && allRank <= 10) ||
                      (weekRank > 0 && weekRank <= 10) ||
                      (monthRank > 0 && monthRank <= 10)
                    );
                  }).length})
                </button>

                {/* Verified */}
                <button
                  onClick={() => toggleFilter("verified")}
                  className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${filters.verified
                    ? "bg-green-600 text-white border-green-600 shadow-sm"
                    : "bg-transparent text-green-700 border-green-400 hover:bg-green-50"
                    }`}
                >
                  🟢 Verified (
                  {
                    profiles.filter(
                      (p) =>
                        p.address_verified ||
                        (p.verified_links_count ?? 0) > 0 ||
                        p.links?.some((l) => l.is_verified)
                    ).length

                  }
                  )
                </button>

                {/* All */}
                <button
                  onClick={clearFilters}
                  className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${!anyFilterActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-transparent text-blue-700 border-blue-400 hover:bg-blue-50"
                    }`}
                >
                  🔵 All ({profiles.length})
                </button>

                {/* Show stats */}
                <button
                  onClick={() => setShowStats((s) => !s)}
                  className={`px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${showStats
                    ? "bg-gray-700 text-white border-gray-700 shadow-sm"
                    : "bg-transparent text-gray-700 border-gray-400 hover:bg-gray-50"
                    }`}
                >
                  {showStats ? "◕ Hide stats" : "◔ Show stats"}
                </button>

                {/* Feedback */}
                <button
                  onClick={() => navigate("/Zechariah")}
                  className="px-2 py-0.5 rounded-full border text-xs font-medium transition-all
             bg-transparent text-gray-700 border-gray-400 hover:bg-gray-50"
                >
                  ❤️ Feedback
                </button>
              </div>
            </div>
          </div>
        )}

        {showStats && showDirectory && <ZcashStats />}

        {/* Header */}
        <div
          ref={searchBarRef}
          className="fixed top-0 left-0 right-0 bg-transparent/20 backdrop-blur-md z-[40] flex items-center justify-between px-4 py-2 shadow-sm"
        >
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                // mimic "Expand Directory" button behavior
                if (showDirectory) {
                  localStorage.setItem("lastScrollY", window.scrollY);
                  setShowDirectory(false);
                } else {
                  setShowDirectory(true);
                  setTimeout(() => {
                    const lastY = parseFloat(localStorage.getItem("lastScrollY")) || 0;
                    window.scrollTo({ top: lastY, behavior: "instant" });
                  }, 100);
                }
              }}
              className="font-bold text-lg text-blue-700 hover:text-blue-800 whitespace-nowrap cursor-pointer"
            >
              Zcash.me/
            </button>
            <div className="relative flex-1 max-w-sm">
              <input
                ref={searchInputRef}

                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFilters({ verified: false, referred: false, ranked: false, featured: false });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowDirectory(true);
                    setFilters({ verified: false, referred: false, ranked: false, featured: false });
                  }
                }}

                placeholder={`search ${profiles.length} names`}
                className="w-full px-3 py-2 text-sm bg-transparent text-gray-800 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-600 pr-8"
              />

              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    requestAnimationFrame(() => {
                      if (searchInputRef.current) {
                        const el = searchInputRef.current;
                        el.focus();
                        el.setSelectionRange(0, 0); // cursor at start
                      }
                    });
                  }}

                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 text-lg font-semibold leading-none z-[100]"
                  aria-label="Clear search"
                >
                  ⛌
                </button>
              )}

              {/* Shared dropdown placed directly below search input */}
              {search && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1 z-[9999]"
                >
                  <ProfileSearchDropdown

                    listOnly={true}
                    value={search}
                    onChange={(v) => {
                      if (typeof v === "object") {
                        // User selected a profile from the dropdown

                        // ✅ Fix: Tell routing hook this was a deliberate user click
                        window.lastSelectionWasExplicit = true;

                        const addr = v.address;
                        setSelectedAddress(addr);
                        window.dispatchEvent(
                          new CustomEvent("selectAddress", { detail: { address: addr } })
                        );

                        setShowDirectory(false);
                        requestAnimationFrame(() =>
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        );
                      } else {
                        setSearch(v);
                      }
                    }}
                    profiles={profiles}
                    placeholder="search"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              // Broadcast the currently active ProfileCard to AddUserForm
              if (selectedProfile) {
                window.dispatchEvent(
                  new CustomEvent("prefillReferrer", {
                    detail: {
                      id: selectedProfile.id,
                      name: selectedProfile.name,
                      address: selectedProfile.address,
                    },
                  })
                );

                window.lastReferrer = {
                  id: selectedProfile.id,
                  name: selectedProfile.name,
                  address: selectedProfile.address,
                };
              }

              setIsJoinOpen(true);
            }}
            className="ml-3 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold 
  shadow-md transition-all duration-300 z-[50] animate-joinPulse
  hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
          >
            ＋ Join
          </button>

          {/* Zcash App Grid Button (added to the right of Join button) */}
          <ZcashGridButton className="ml-2 z-[50]" />

          <style>{`
  @keyframes joinPulse {
    0%, 100% { transform: scale(.9); box-shadow: 0 0 0 0 rgba(34,197,94, 0.6); }
    50% { transform: scale(1.0); box-shadow: 0 0 0 8px rgba(34,197,94, 0); }
  }
  .animate-joinPulse {
    animation: joinPulse 5.5s ease-in-out infinite;
  }
`}</style>


        </div>

        {/* Directory List */}
        {showDirectory && (
          <>
            {sorted.length === 0 ? (
              /* no results rendering unchanged */
              (() => {
                const activeLabels = Object.entries(filters)
                  .filter(([, v]) => v)
                  .map(([k]) => {
                    if (k === "verified") return "Verified";
                    if (k === "ranked") return "Ranked";
                    if (k === "featured") return "Featured";
                    return k;
                  });

                const labelText =
                  activeLabels.length > 1
                    ? activeLabels
                      .slice(0, -1)
                      .join(", ") +
                    " and " +
                    activeLabels.slice(-1)
                    : activeLabels[0];

                const filterSummary =
                  activeLabels.length > 0 ? ` who are ${labelText}` : "";

                return (
                  <div className="text-center text-gray-400 italic mt-10">
                    {search ? (
                      <>
                        No Zcash names match "
                        <span className="text-blue-700">{search}</span>"
                        {filterSummary}.
                        <br />
                        {activeLabels.length > 0 ? (
                          <button
                            onClick={clearFilters}
                            className="text-blue-700 hover:underline font-medium"
                          >
                            Reset the filters
                          </button>
                        ) : (
                          <>
                            Maybe it’s time to{" "}
                            <button
                              onClick={() => setIsJoinOpen(true)}
                              className="text-blue-700 hover:underline font-medium"
                            >
                              claim it
                            </button>
                            ?
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        No Zcash names are {labelText || "filtered out"}.
                        <br />
                        <button
                          onClick={clearFilters}
                          className="text-blue-700 hover:underline font-medium"
                        >
                          Reset filters
                        </button>
                      </>
                    )}
                  </div>
                );
              })()
            ) : (
              letters.map((letter) => (
                <div key={letter} id={`letter-${letter}`} className="mb-6">
                  <h2
                    onClick={() => setShowLetterGrid(true)}
                    className="text-lg font-semibold text-gray-700 mb-2 cursor-pointer hover:text-blue-600 transition"
                  >
                    {letter}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {grouped[letter].map((p) => (
                      <ProfileCard
                        key={p.id ?? p.address}
                        profile={p}
                        data-address={p.address}
                        onSelect={(addr) => {

                          // mark that the user intentionally selected a specific profile
                          window.lastSelectionWasExplicit = true;

                          // Save the scroll position and selected address
                          localStorage.setItem("lastScrollY", window.scrollY.toString());
                          localStorage.setItem("lastSelectedAddress", addr);

                          setSelectedAddress(addr);

                          window.dispatchEvent(
                            new CustomEvent("selectAddress", { detail: { address: addr } })
                          );

                          setShowDirectory(false);

                          requestAnimationFrame(() => {

                            window.scrollTo({ top: 0, behavior: "smooth" });
                          });
                        }}


                        cacheVersion={
                          p.last_signed_at || p.created_at || 0
                        } // passed to ProfileCard for ?v=
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        <AlphabetSidebar
          letters={letters}
          activeLetter={activeLetter}
          onSelect={scrollToLetter}
          show={showDirectory && showAlpha}
        />

        {activeLetter && (
          <div className="fixed right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2 bg-gray-800 text-white text-4xl font-bold rounded-2xl px-6 py-4 opacity-90">
            {activeLetter}
          </div>
        )}

        {showLetterGrid && (
          <LetterGridModal
            letters={letters}
            onSelect={handleGridSelect}
            onClose={() => setShowLetterGrid(false)}
          />
        )}


        <AddUserForm
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
          onUserAdded={(newProfile) => {
            addProfile(newProfile);
            setIsJoinOpen(false);
          }}

        />


        {!showDirectory && selectedProfile && (
          <ProfileCard
            key={selectedProfile.address}
            profile={selectedProfile}
            onSelect={() => { }}
            fullView
            warning={{
              message: `${selectedProfile.name} may not be who you think.`,
              link: "#",
            }}
            cacheVersion={
              selectedProfile.last_signed_at ||
              selectedProfile.created_at ||
              0
            }
          />
        )}

        <div id="zcash-feedback">
          <ZcashFeedback />
        </div>

        <div className="fixed bottom-6 left-6 z-[9999] flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                if (showDirectory) {
                  localStorage.setItem("lastScrollY", window.scrollY);
                  setShowDirectory(false);
                } else {
                  setShowDirectory(true);
                  setTimeout(() => {
                    const lastAddr = localStorage.getItem("lastSelectedAddress");
                    if (lastAddr) {
                      const el = document.querySelector(`[data-address="${lastAddr}"]`);
                      if (el) {
                        el.scrollIntoView({ behavior: "instant", block: "center" });
                        return;
                      }
                    }
                    const lastY = parseFloat(localStorage.getItem("lastScrollY")) || 0;
                    window.scrollTo({ top: lastY, behavior: "instant" });
                  }, 100);
                }
              }}
              className={`relative text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 ${showDirectory
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-gray-600 hover:bg-gray-700"
                }`}
              title={showDirectory ? "Collapse Directory" : "Expand Directory"}
            >
              <img
                src={showDirectory ? bookOpen : bookClosed}
                alt="Toggle Directory"
                className="w-6 h-6"
              />
            </button>
          </div>

          {/* 🩶 Show toast-like prompt when viewing a profile */}
          {!showDirectory && (
            <div
              onClick={() => setShowDirectory(true)}
              className="cursor-pointer bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-gray-700 transition-all animate-toastSlideLeft"
            >
              Reopen Directory
            </div>
          )}
        </div>

        <style>{`
  /* Unified toast animation — slide in from left, pause, fade & slide out left */
  @keyframes toastSlideLeft {
    0% { opacity: 0; transform: translateX(-40px); }
    10% { opacity: 1; transform: translateX(0); }
    80% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(-40px); }
  }

  .animate-toastSlideLeft {
    animation: toastSlideLeft 5s ease-in-out forwards;
  }
     /* mirror animation for right side toast */
  @keyframes toastSlideRight {
    0% { opacity: 0; transform: translateX(40px); }
    10% { opacity: 1; transform: translateX(0); }
    80% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(40px); }
  }

  .animate-toastSlideRight {
    animation: toastSlideRight 5s ease-in-out forwards;
  }
`}</style>
      </div>



    </>
  );
}
