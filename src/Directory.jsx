import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
import Toast from "./Toast";

import ProfileCard from "./components/ProfileCard";
import LetterGridModal from "./components/LetterGridModal";
import AlphabetSidebar from "./components/AlphabetSidebar";

import CopyButton from "./components/CopyButton";


import useProfiles from "./hooks/useProfiles";
import useProfileRouting from "./hooks/useProfileRouting";
import useAlphaVisibility from "./hooks/useAlphaVisibility";
import useDirectoryVisibility from "./hooks/useDirectoryVisibility";
import useToastMessage from "./hooks/useToastMessage";


import computeGoodThru from "./utils/computeGoodThru";


import { useFeedback } from "./store";

import writeIcon from "./assets/write.svg";
import bookOpen from "./assets/book-open.svg";
import bookClosed from "./assets/book-closed.svg";

// Keep identical env behavior
const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || "";

export default function Directory() {
  const navigate = useNavigate();

  // external store
  const { setSelectedAddress, selectedAddress, setForceShowQR } = useFeedback();

  // data
  const { profiles, loading } = useProfiles();

  // directory visibility and transient label
  const { showDirectory, setShowDirectory, showDirLabel } = useDirectoryVisibility();

  // alpha sidebar visibility on interaction
  const showAlpha = useAlphaVisibility(showDirectory);

  // toast
  const { toastMsg, showToast, showNotice, closeToast } = useToastMessage();

  // local UI state
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showFullAddr, setShowFullAddr] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [qrShown, setQRShown] = useState(false);
  const [linksShown, setLinksShown] = useState(false);

  // refs
  const searchBarRef = useRef(null);
const lastScrollRef = useRef(0);

  // routing sync (merged effects) with identical behavior
  useProfileRouting(profiles, selectedAddress, setSelectedAddress, showDirectory, setShowDirectory);

  // derive selected profile with good_thru identical to original
  const selectedProfile = useMemo(() => {
    const match = profiles.find((p) => p.address === selectedAddress);
    if (!match) return null;
    const good_thru = computeGoodThru(match.since, match.last_signed_at);
    return { ...match, good_thru };
  }, [profiles, selectedAddress]);

  // sort, filter, group
  const { sorted, grouped, letters } = useMemo(() => {
    const s = [...profiles]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    const g = s.reduce((acc, p) => {
      const first = p.name?.[0]?.toUpperCase() || "#";
      (acc[first] ||= []).push(p);
      return acc;
    }, {});
    const L = Object.keys(g).sort();
    return { sorted: s, grouped: g, letters: L };
  }, [profiles, search]);

  // scroll helpers identical visuals
  const scrollToLetter = (letter) => {
    if (letter === "⌕") {
      searchBarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      const headerOffset = 70;
      const rect = el.getBoundingClientRect();
      const offsetPosition = window.scrollY + rect.top - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      setActiveLetter(letter);
      window.clearTimeout(scrollToLetter._to);
      scrollToLetter._to = window.setTimeout(() => setActiveLetter(null), 600);
    }
  };

  // modal for letter grid
  const [showLetterGrid, setShowLetterGrid] = useState(false);
  const handleGridSelect = (letter) => {
    setShowLetterGrid(false);
    setTimeout(() => scrollToLetter(letter), 200);
  };

  // loading identical
  if (loading) return <p className="text-center mt-8">Loading directory…</p>;

  return (
    <>
      <div className="relative max-w-3xl mx-auto p-4 pb-24 pt-20">
        {/* --- Join Button --- */}
        <button
          onClick={() => setIsJoinOpen(true)}
          className="fixed top-3 right-4 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 transition-all animate-pulse hover:scale-110 z-50"
          style={{ animation: "pulseJoin 2.5s infinite" }}
        >
          ＋ Join
        </button>

        {/* {showStats && showDirectory && <ZcashStats />} */}
        {showDirectory && <ZcashStats />}

        {/* --- Header --- */}
        <div
          ref={searchBarRef}
          className="fixed top-0 left-0 right-0 bg-transparent/20 backdrop-blur-md z-[40] flex items-center justify-between px-4 py-2 shadow-sm"
        >
          {/* Left side: site title + search bar */}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") setShowDirectory(true);
                }}
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

          {/* Right side: Join button */}
          <button
            onClick={() => setIsJoinOpen(true)}
            className="ml-3 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 transition-all z-[50]"
          >
            ＋ Join
          </button>
        </div>

        {showDirectory && (
          <>
            {sorted.length === 0 ? (
              <div className="text-center text-gray-400 italic mt-10">
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
                          requestAnimationFrame(() => {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* --- Alphabet Bar --- */}
<AlphabetSidebar
  letters={letters}
  scrollToLetter={scrollToLetter}
  showDirectory={showDirectory}
/>


        {/* --- Floating Letter Indicator --- */}
        {activeLetter && (
          <div className="fixed right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2 bg-gray-800 text-white text-4xl font-bold rounded-2xl px-6 py-4 opacity-90">
            {activeLetter}
          </div>
        )}

        {/* --- Letter Grid Modal (single source) --- */}
        {showLetterGrid && (
          <LetterGridModal
            letters={letters}
            onSelect={handleGridSelect}
            onClose={() => setShowLetterGrid(false)}
          />
        )}

        {/* --- AddUserForm Modal --- */}
        <AddUserForm
          isOpen={isJoinOpen}
          onClose={() => setIsJoinOpen(false)}
          onUserAdded={() => {
            setIsJoinOpen(false);
            window.location.reload();
          }}
        />

{/* --- Selected Profile Summary --- */}
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

        {/* Feedback Section */}
        <div id="zcash-feedback">
          <ZcashFeedback />
        </div>

        {/* Floating Directory Toggle */}
        <div className="fixed bottom-6 left-6 z-[9999]">
          <div className="relative">
            <button
       onClick={() => {
  if (showDirectory) {
    // store position before hiding
    localStorage.setItem("lastScrollY", window.scrollY);
    setShowDirectory(false);
  } else {
    // restore after DOM paints
    setShowDirectory(true);
    setTimeout(() => {
      const lastY = parseFloat(localStorage.getItem("lastScrollY")) || 0;
      window.scrollTo({ top: lastY, behavior: "instant" });
    }, 100); // wait 100ms for directory to render
  }
}}

              className={`relative text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 ${
                showDirectory ? "bg-yellow-600 hover:bg-yellow-700" : "bg-gray-600 hover:bg-gray-700"
              }`}
              title={showDirectory ? "Collapse Directory" : "Expand Directory"}
            >
              <img
                src={showDirectory ? bookOpen : bookClosed}
                alt="Toggle Directory"
                className="w-6 h-6"
              />
            </button>

            <div
              className={`absolute bottom-1 left-full ml-3 transition-all duration-500 ease-out ${
                !showDirectory && showDirLabel ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
              }`}
            >
              {!showDirectory && showDirLabel && (
                <button
                  onClick={() => {
                    const currentY = window.scrollY;
                    setShowDirectory(true);
                    requestAnimationFrame(() =>
                      window.scrollTo({ top: currentY, behavior: "auto" })
                    );
                  }}
                  className="text-sm font-semibold text-white bg-gray-700/90 px-3 py-1 rounded-full shadow-md hover:bg-gray-600 transition-colors duration-300 whitespace-nowrap"
                  style={{ backdropFilter: "blur(4px)" }}
                >
                  Show Directory
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toast message={toastMsg} show={showToast} onClose={closeToast} />

      <style>
        {`
        @keyframes pulseJoin {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        `}
      </style>
    </>
  );
}
