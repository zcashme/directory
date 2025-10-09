import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
import { useFeedback } from "./store";
import { useLocation } from "react-router-dom";

const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || "";
import Toast from "./Toast";
import writeIcon from "./assets/write.svg";
import bookOpen from "./assets/book-open.svg";
import bookClosed from "./assets/book-closed.svg";
import { useNavigate } from "react-router-dom";

export default function Directory() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showLetterGrid, setShowLetterGrid] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showDirectory, setShowDirectory] = useState(true);
  const [showFullAddr, setShowFullAddr] = useState(false);
const location = useLocation();

  const alphaRef = useRef(null);
  const searchBarRef = useRef(null);
  const [showAlpha, setShowAlpha] = useState(false);
  const idleRef = useRef(null);
  const [showDirLabel, setShowDirLabel] = useState(true);

const { setSelectedAddress, selectedAddress, setForceShowQR } = useFeedback();

  // 🧩 NEW: sync slug to selected profile name
useEffect(() => {
  if (!profiles.length) return;

  const match = profiles.find((p) => p.address === selectedAddress);

  if (match?.name) {
    navigate(`/${match.name}`, { replace: false });
  } else {
    if (showDirectory) {
      navigate(`/`, { replace: false });
    }
  }
}, [selectedAddress, profiles, navigate, showDirectory]);

useEffect(() => {
  const handleCloseDir = () => setShowDirectory(false);
  window.addEventListener("closeDirectory", handleCloseDir);
  return () => window.removeEventListener("closeDirectory", handleCloseDir);
}, []);


  useEffect(() => {
    if (!showDirectory) {
      setShowDirLabel(true);
      const t = setTimeout(() => setShowDirLabel(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showDirectory]);
  // Collapse directory automatically if visiting a slug directly
useEffect(() => {
  const path = window.location.pathname.slice(1); // e.g., "Alice"
  if (path) {
    const profile = profiles.find(
      (p) => p.name.toLowerCase() === decodeURIComponent(path).toLowerCase()
    );
    if (profile) {
      setSelectedAddress(profile.address);
      setShowDirectory(false); // 🔻 collapse to focus on namecard
    }
  }
}, [profiles]);

  useEffect(() => {
    const show = () => {
      setShowAlpha(true);
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => setShowAlpha(false), 2800);
    };

    const onScroll = () => show();
    const onWheel = () => show();
    const onTouchMove = () => show();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, []);

  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  const showNotice = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  useEffect(() => {
    async function fetchProfiles() {
const { data, error } = await supabase
  .from("public_profile")
  .select("name, since, status_computed, last_signed_at, address");

if (error) {
  console.error(error);
} else {
  // ✅ compute good_thru locally (60 days past since or last_signed_at)
  const enriched = (data || []).map((p) => {
    const sinceDate = p.since ? new Date(p.since) : null;
    const lastSigned = p.last_signed_at ? new Date(p.last_signed_at) : null;

    const latest = lastSigned && sinceDate
      ? (lastSigned > sinceDate ? lastSigned : sinceDate)
      : (lastSigned || sinceDate);

    const goodThru = latest
      ? new Date(latest.getTime() + 60 * 24 * 60 * 60 * 1000)
      : null;

    return { ...p, good_thru: goodThru };
  });

  setProfiles(enriched);
}

setLoading(false);

    }
    fetchProfiles();
  }, []);

  const sorted = [...profiles]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const grouped = sorted.reduce((acc, p) => {
    const first = p.name?.[0]?.toUpperCase() || "#";
    (acc[first] ||= []).push(p);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort();

  const scrollToLetter = (letter) => {
    if (letter === "⌕") {
      searchBarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveLetter(letter);
      window.clearTimeout(scrollToLetter._to);
      scrollToLetter._to = window.setTimeout(() => setActiveLetter(null), 600);
    }
  };
  const handleGridSelect = (letter) => {
    setShowLetterGrid(false);
    setTimeout(() => scrollToLetter(letter), 200);
  };

  const handleAlphaTouch = (clientY) => {
    const container = alphaRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll("button[data-letter]"));
    const btn = buttons.find((b) => {
      const r = b.getBoundingClientRect();
      return clientY >= r.top && clientY <= r.bottom;
    });
    if (btn) scrollToLetter(btn.dataset.letter);
  };

  const [selectedProfile, setSelectedProfile] = useState(null);

useEffect(() => {
  const match = profiles.find((p) => p.address === selectedAddress);

  if (match) {
    const sinceDate = match.since ? new Date(match.since) : null;
    const lastSigned = match.last_signed_at ? new Date(match.last_signed_at) : null;

    // pick whichever is later
    const latest = lastSigned && sinceDate
      ? (lastSigned > sinceDate ? lastSigned : sinceDate)
      : (lastSigned || sinceDate);

    // compute good_thru = latest + 60 days
    const goodThru = latest ? new Date(latest.getTime() + 60 * 24 * 60 * 60 * 1000) : null;

    setSelectedProfile({ ...match, good_thru: goodThru });
  } else {
    setSelectedProfile(null);
  }
}, [selectedAddress, profiles]);

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
  className="fixed top-0 left-0 right-0 bg-transparent backdrop-blur-sm z-40 flex flex-wrap sm:flex-nowrap items-center gap-2 px-4 py-2 justify-start"
>
  <div className="flex items-center gap-2 min-w-0 flex-1">
    <a
      href="/"
      className="font-bold text-lg whitespace-nowrap text-blue-700 hover:text-blue-800 transition-colors duration-200"
    >
      Zcash.me/
    </a>

    <div className="relative flex-1">
     <input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      // 👇 when pressing Enter, reveal the directory
      setShowDirectory(true);
    }
  }}
  placeholder={`search ${profiles.length} names`}
  className="w-full px-3 py-2 text-sm bg-transparent text-gray-800 placeholder-gray-400 outline-none border-none shadow-none focus:outline-none"
  style={{
    background: "transparent",
    borderBottom: "1px solid transparent",
    transition: "border-color 0.2s ease-in-out",
  }}
  onFocus={(e) =>
    (e.target.style.borderBottom = "1px solid rgb(29, 78, 216)")
  }
  onBlur={(e) =>
    (e.target.style.borderBottom = "1px solid transparent")
  }
/>

  {/* 👇 Clear search button (only shows when text exists) */}
  {search && (
    <button
      onClick={() => setSearch("")}
      className="absolute left-70 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-lg font-semibold leading-none"
      aria-label="Clear search"
    >
      ⛌
    </button>
  )}
</div>
  </div>

{/* removed outer Show/Hide Stats toggle (handled inside ZcashStats) */}

</div>


        {showDirectory && (
  <>
    {sorted.length === 0 ? (
      <div className="text-center text-gray-500 italic mt-10">
        No Zcash names match "<span className="text-blue-700">{search}</span>".
        <br />
        Maybe it’s time to <button
          onClick={() => setIsJoinOpen(true)}
          className="text-blue-700 hover:underline font-medium"
        >
          claim it
        </button>?
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
              <div
                key={p.name}
                className="relative border rounded-xl p-3 shadow-sm hover:shadow-md transition bg-transparent cursor-pointer"
                onClick={() => {
                  setSelectedAddress(p.address);
                  setShowDirectory(false);
                  document
                    .getElementById("zcash-feedback")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <button
                  onClick={() => {
                    setSelectedAddress(p.address);
                    setShowDirectory(false);
                    document
                      .getElementById("zcash-feedback")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="font-medium text-blue-700 hover:underline truncate text-left focus:outline-none"
                >
                  {p.name}
                </button>

                <div className="text-xs text-gray-600 mt-1">
                  <span
                    className={
                      p.status_computed === "claimed"
                        ? "text-green-600"
                        : "text-red-500"
                    }
                  >
                    {p.status_computed === "claimed"
                      ? "verified"
                      : "unverified"}
                  </span>{" "}
                  • since {new Date(p.since).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))
    )}
  </>
)}


        {/* --- Alphabet Bar --- */}
        <div
          ref={alphaRef}
          className={`fixed right-2 top-1/4 flex flex-col items-center select-none z-40 transition-opacity duration-500 ease-out ${
            showDirectory && showAlpha
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onTouchStart={(e) => handleAlphaTouch(e.touches[0].clientY)}
          onTouchMove={(e) => {
            e.preventDefault();
            handleAlphaTouch(e.touches[0].clientY);
          }}
        >
          {letters.map((l) => (
            <button
              key={l}
              data-letter={l}
              className="text-gray-500 text-sm py-0.5 hover:text-black active:scale-110"
              onMouseDown={() => scrollToLetter(l)}
            >
              {l}
            </button>
          ))}
        </div>

        {/* --- Floating Letter Indicator --- */}
        {activeLetter && (
          <div className="fixed right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2 bg-gray-800 text-white text-4xl font-bold rounded-2xl px-6 py-4 opacity-90">
            {activeLetter}
          </div>
        )}

        {/* --- Letter Grid Modal --- */}
        {showLetterGrid && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowLetterGrid(false)}
          >
            <div
              className="grid grid-cols-5 gap-4 text-white text-4xl font-bold text-center select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowLetterGrid(false);
                  setTimeout(() => {
                    const input = document.querySelector(
                      'input[placeholder="search names"]'
                    );
                    if (input) input.focus();
                  }, 150);
                }}
                className="hover:text-yellow-400 active:scale-125 transition-transform"
                title="Search"
              >
                ⌕
              </button>

              {letters.map((l) => (
                <button
                  key={l}
                  onClick={() => handleGridSelect(l)}
                  className="hover:text-yellow-400 active:scale-125 transition-transform"
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
{/* --- Letter Grid Modal --- */}
{showLetterGrid && (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    onClick={() => setShowLetterGrid(false)}
  >
    <div
      className="grid grid-cols-5 gap-4 text-white text-4xl font-bold text-center select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 🔍 Search button */}
      <button
        onClick={() => {
          setShowLetterGrid(false);
          setTimeout(() => {
            const input = document.querySelector('input[placeholder^="search"]');
            if (input) input.focus();
          }, 150);
        }}
        className="hover:text-yellow-400 active:scale-125 transition-transform"
        title="Search"
      >
        ⌕
      </button>

      {/* 🅰️ Letter buttons */}
      {letters.map((l) => (
        <button
          key={l}
          onClick={() => {
            setShowLetterGrid(false);
            setTimeout(() => scrollToLetter(l), 200);
          }}
          className="hover:text-yellow-400 active:scale-125 transition-transform"
        >
          {l}
        </button>
      ))}
    </div>
  </div>
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
        {!showDirectory && (
          <>
            {selectedAddress?.trim() === ADMIN_ADDRESS?.trim() ? (
              <div className="mt-6 mb-2 p-4 rounded-xl bg-transparent animate-fadeIn">
                <ZcashStats />
              </div>
            ) : (
              selectedProfile && (
                <div className="mt-6 mb-2 p-4 rounded-xl bg-transparent animate-fadeIn text-center">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedProfile.name}
                  </h2>
<p className="text-sm text-gray-700 font-mono mb-2 flex items-center justify-center gap-2">
  {selectedProfile.address ? (
    <>
      <span className="select-all">
        {selectedProfile.address.slice(0, 10)}…{selectedProfile.address.slice(-10)}
      </span>
      <button
        onClick={() => {
          navigator.clipboard.writeText(selectedProfile.address);
          setToastMsg("Zcash address copied!");
          setShowToast(true);
        }}
        className="text-gray-500 hover:text-blue-600 transition-colors text-base"
        title="Copy Zcash address"
      >
        ⧉
      </button>
<button
  onClick={() => {
    setForceShowQR(true); // ✅ tell ZcashFeedback to show QR now
    const qrSection = document.getElementById("zcash-feedback");
    if (qrSection) qrSection.scrollIntoView({ behavior: "smooth" });
    setToastMsg("QR code shown.");
    setShowToast(true);
  }}
  className="text-blue-700 hover:underline text-xs font-semibold"
>
  Show QR
</button>

    </>
  ) : (
    "—"
  )}
</p>

<p className="text-xs text-gray-500 mb-3">
  Since{" "}
  {selectedProfile.since
    ? new Date(selectedProfile.since).toLocaleDateString()
    : "NULL"}
  {" "}
  • Last active{" "}
  {selectedProfile.last_signed_at
    ? new Date(selectedProfile.last_signed_at).toLocaleDateString()
    : "NULL"}
  {" "}
  • Good thru{" "}
  {selectedProfile.good_thru
    ? new Date(selectedProfile.good_thru).toLocaleDateString()
    : "NULL"}
</p>

{/* --- Warning boxes --- */}
{(() => {
  const now = new Date();
  const lastSeen = selectedProfile.last_signed_at
    ? new Date(selectedProfile.last_signed_at)
    : null;

  // If never signed, treat as very old
  const inactiveDays =
    lastSeen ? Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24)) : Infinity;

  const socialWarning = true; // (placeholder until social verification exists)
  const inactivityWarning = inactiveDays > 7;

  return (
    <>
      {/* Social warning */}
      {socialWarning && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block max-w-sm mx-auto">
          ⚠ <strong>{selectedProfile.name}</strong> may not be who you think.
          <br />
          0 verified accounts.
        </div>
      )}

      {/* Inactivity warning */}
      {inactivityWarning && (
        <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 inline-block max-w-sm mx-auto">
          ⚠ <strong>{selectedProfile.name}</strong> may not be monitoring this address.
          <br />
          &gt;7 days without response.
        </div>
      )}

<div>    
   </div>
<button
  onClick={() => {
    setToastMsg("Sign-in coming soon!");
    setShowToast(true);
  }}
  className="text-blue-700 hover:underline text-xs font-semibold"
>
  Are you <strong>{selectedProfile.name}</strong>? Sign in.
</button>

    </>
  );
})()}


                </div>
              )
            )}
          </>
        )}

        {/* --- Feedback Section --- */}
        <div id="zcash-feedback">
          <ZcashFeedback />
        </div>

        {/* --- Floating Directory Toggle --- */}
        <div className="fixed bottom-6 left-6 z-[9999]">
          <div className="relative">
            <button
              onClick={() => {
                if (showDirectory) {
                  setShowDirectory(false);
                } else {
                  const currentY = window.scrollY;
                  setShowDirectory(true);
                  requestAnimationFrame(() =>
                    window.scrollTo({ top: currentY, behavior: "auto" })
                  );
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

            <div
              className={`absolute bottom-1 left-full ml-3 transition-all duration-500 ease-out ${
                !showDirectory && showDirLabel
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-2"
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

      <Toast
        message={toastMsg}
        show={showToast}
        onClose={() => setShowToast(false)}
      />

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
