import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
import Toast from "./Toast";

import ProfileCard from "./components/ProfileCard";
import LetterGridModal from "./components/LetterGridModal";
import AlphabetSidebar from "./components/AlphabetSidebar";

import useProfiles from "./hooks/useProfiles";
import useProfileRouting from "./hooks/useProfileRouting";
import useAlphaVisibility from "./hooks/useAlphaVisibility";
import useDirectoryVisibility from "./hooks/useDirectoryVisibility";
import useToastMessage from "./hooks/useToastMessage";

import computeGoodThru from "./utils/computeGoodThru";
import { useFeedback } from "./store";

import bookOpen from "./assets/book-open.svg";
import bookClosed from "./assets/book-closed.svg";

export default function Directory() {
  const navigate = useNavigate();
  const { setSelectedAddress, selectedAddress } = useFeedback();
  const { profiles, loading } = useProfiles();
  const { showDirectory, setShowDirectory } = useDirectoryVisibility();
  const showAlpha = useAlphaVisibility(showDirectory);
  const { toastMsg, showToast, closeToast } = useToastMessage();

  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // multi-filter state
  const [filters, setFilters] = useState({
    verified: false,
    referred: false,
    ranked: false,
  });

  const searchBarRef = useRef(null);

  useProfileRouting(profiles, selectedAddress, setSelectedAddress, showDirectory, setShowDirectory);

  // compute referrals (RefRank)
  const referralCounts = useMemo(() => {
    const counts = {};
    profiles.forEach((p) => {
      const ref = p.referred_by?.trim();
      if (!ref) return;
      counts[ref] = (counts[ref] || 0) + 1;
    });
    return counts;
  }, [profiles]);

  // derived data
  const processedProfiles = useMemo(() => {
    return profiles.map((p) => {
      const verifiedLinks = p.links?.filter((l) => l.is_verified).length || 0;
      const verifications = (p.address_verified ? 1 : 0) + verifiedLinks;
      const refRank = referralCounts[p.name] || referralCounts[p.slug] || 0;
      return { ...p, verifications, refRank };
    });
  }, [profiles, referralCounts]);

  const selectedProfile = useMemo(() => {
    const match = processedProfiles.find((p) => p.address === selectedAddress);
    if (!match) return null;
    const good_thru = computeGoodThru(match.since, match.last_signed_at);
    return { ...match, good_thru };
  }, [processedProfiles, selectedAddress]);

  // filter + grouping logic
  const { sorted, grouped, letters } = useMemo(() => {
    let s = [...processedProfiles].filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    // apply filters
    const { verified, referred, ranked } = filters;
    if (verified) {
      s = s.filter((p) => p.address_verified || p.links?.some((l) => l.is_verified));
    }
    if (referred) {
      s = s.filter((p) => !!p.referred_by);
    }
    if (ranked) {
      s = s.filter((p) => p.refRank > 0);
    }

    // Default sort by name
    s.sort((a, b) => a.name.localeCompare(b.name));

    // Group by first letter
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
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearFilters = () => {
    setFilters({ verified: false, referred: false, ranked: false });
  };

  const anyFilterActive = Object.values(filters).some(Boolean);

  if (loading) return <p className="text-center mt-8">Loading directory…</p>;

  return (
    <>
      <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-20">
        {/* Floating Join Button */}
        <button
          onClick={() => setIsJoinOpen(true)}
          className="fixed top-3 right-4 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 transition-all animate-pulse hover:scale-110 z-50"
          style={{ animation: "pulseJoin 2.5s infinite" }}
        >
          ＋ Join
        </button>

        {showDirectory && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-sm text-blue-700 flex-wrap">
              <button onClick={() => setShowStats((s) => !s)} className="hover:underline">
                {showStats ? "◕ Hide stats" : "◔ Show stats"}
              </button>

              <span className="text-gray-400">|</span>
              <span className="text-gray-700">Filter:</span>

              <button
                onClick={clearFilters}
                className={`hover:underline ${
                  !anyFilterActive ? "underline text-blue-700" : "text-blue-700"
                }`}
              >
                All
              </button>
              <button
                onClick={() => toggleFilter("verified")}
                className={`hover:underline ${
                  filters.verified ? "underline text-blue-700" : "text-blue-700"
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => toggleFilter("referred")}
                className={`hover:underline ${
                  filters.referred ? "underline text-blue-700" : "text-blue-700"
                }`}
              >
                Referred
              </button>
              <button
                onClick={() => toggleFilter("ranked")}
                className={`hover:underline ${
                  filters.ranked ? "underline text-blue-700" : "text-blue-700"
                }`}
              >
                Ranked
              </button>
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
            <a
              href="/"
              className="font-bold text-lg text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Zcash.me/
            </a>
            <div className="relative flex-1 max-w-sm">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setShowDirectory(true)}
                placeholder={`search ${profiles.length} names`}
                className="w-full px-3 py-2 text-sm bg-transparent text-gray-800 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-600 pr-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 text-lg font-semibold leading-none z-[100]"
                  aria-label="Clear search"
                >
                  ⛌
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsJoinOpen(true)}
            className="ml-3 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 transition-all z-[50]"
          >
            ＋ Join
          </button>
        </div>

        {/* Directory List */}
        {showDirectory && (
          <>
{sorted.length === 0 ? (
  <div className="text-center text-gray-400 italic mt-10">
    {search ? (
      <>
        No Zcash names match "<span className="text-blue-700">{search}</span>".
        <br />
        Maybe it’s time to{" "}
        <button
          onClick={() => setIsJoinOpen(true)}
          className="text-blue-700 hover:underline font-medium"
        >
          claim it
        </button>
        ?
      </>
    ) : (
      <>
        {(() => {
          const activeLabels = Object.entries(filters)
            .filter(([_, v]) => v)
            .map(([k]) =>
              k === "verified" ? "Verified" : k === "referred" ? "Referred" : "Ranked"
            );
          const labelText =
            activeLabels.length > 1
              ? activeLabels.slice(0, -1).join(", ") + " and " + activeLabels.slice(-1)
              : activeLabels[0];
          return (
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
          );
        })()}
      </>
    )}
  </div>
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
                        key={p.name}
                        profile={p}
                        onSelect={(addr) => {
                          setSelectedAddress(addr);
                          setShowDirectory(false);
                          requestAnimationFrame(() =>
                            window.scrollTo({ top: 0, behavior: "smooth" })
                          );
                        }}
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
          onUserAdded={() => {
            setIsJoinOpen(false);
            window.location.reload();
          }}
        />

        {!showDirectory && selectedProfile && (
          <ProfileCard
            profile={selectedProfile}
            onSelect={() => {}}
            fullView
            warning={{
              message: `${selectedProfile.name} may not be who you think.`,
              link: "#",
            }}
          />
        )}

        <div id="zcash-feedback">
          <ZcashFeedback />
        </div>

        <div className="fixed bottom-6 left-6 z-[9999]">
          <div className="relative">
            <button
              onClick={() => {
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
              className={`relative text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 ${
                showDirectory
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
        </div>
      </div>

      <Toast message={toastMsg} show={showToast} onClose={closeToast} />

      <style>{`
        @keyframes pulseJoin {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </>
  );
}
