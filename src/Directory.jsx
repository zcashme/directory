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
  const [showDetail, setShowDetail] = useState(false);
const [showLinks, setShowLinks] = useState(false);

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

const currentSlug = window.location.pathname.slice(1).trim().toLowerCase();

if (match?.name) {
  // keep slug in lowercase, matching selected profile
  navigate(`/${encodeURIComponent(match.name.toLowerCase())}`, { replace: false });
} else if (!currentSlug) {
  // only go home if there’s no slug in URL
  if (showDirectory) navigate(`/`, { replace: false });
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
  if (!path) return;

  const slug = decodeURIComponent(path).trim().toLowerCase();
  const profile = profiles.find(
    (p) => (p.name || "").trim().toLowerCase() === slug
  );

  if (profile) {
    // ✅ Known name: show its card
    setSelectedAddress(profile.address);
    setShowDirectory(false);
  } else {
    // ❌ Unknown name: show “no match” view
    setSearch(slug);
    setSelectedAddress(ADMIN_ADDRESS); // default to feedback admin
    setShowDirectory(true);
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
  const headerOffset = 70; // adjust if header height changes
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

const [copied, setCopied] = useState(false);
const [qrShown, setQRShown] = useState(false);
const [linksShown, setLinksShown] = useState(false);

const [showAllWarnings, setShowAllWarnings] = useState(false);


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
  className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-md z-[60] flex items-center justify-between px-4 py-2 shadow-sm"
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
      onClick={() => {
        setSelectedAddress(p.address);
        setShowDirectory(false);
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }}

className="flex items-center gap-3 p-3 mb-2 rounded-2xl bg-transparent border border-black/30 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      {/* Avatar placeholder */}
      <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-blue-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="" // svg icon here
          />
        </svg>
      </div>

      {/* Name and info */}
      <div className="flex flex-col overflow-hidden">
<span className="font-semibold text-blue-700 leading-tight truncate flex items-center gap-2">
  {p.name}
  {(() => {
    const sinceDate = new Date(p.since);
    const today = new Date();
const todayUTC = new Date().toISOString().slice(0, 10);
const isNew = (p.since || "").slice(0, 10) === todayUTC;

    return isNew ? (
      <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-0.5 rounded-full shadow-sm">
        NEW
      </span>
    ) : null;
  })()}
</span>

        <span className="text-sm text-gray-400 truncate">
          <span
            className={
              p.status_computed === "claimed"
                ? "text-green-600"
                : "text-red-400"
            }
          >
            {p.status_computed === "claimed" ? "Verified" : "Unverified"}
          </span>{" "}
        • Joined {new Date(p.since).toLocaleString("default", { month: "short", year: "numeric" })}

        </span>
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
              className="text-gray-400 text-sm py-0.5 hover:text-black active:scale-110"
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

{/*  Sign in (right) */}
{selectedProfile && (
  <div className="max-w-3xl mx-auto flex justify-end items-center mb-2 px-1">

    {/* Sign-in button (right) */}
    <button
      onClick={() => {
        setToastMsg("Sign-in coming soon!");
        setShowToast(true);
      }}
      className="text-sm text-blue-700 font-semibold hover:underline transition-colors duration-200"
    >
      Sign in as {selectedProfile.name}
    </button>
  </div>
)}



        {/* --- Selected Profile Summary --- */}
        {!showDirectory && (
          <>
            {selectedAddress?.trim() === ADMIN_ADDRESS?.trim() ? (
              <div className="mt-6 mb-2 p-4 rounded-xl bg-transparent animate-fadeIn">
                <ZcashStats />
              </div>
            ) : (
              selectedProfile && (


<div className="mt-3 mb-8 p-6 rounded-2xl bg-transparent shadow-md animate-fadeIn text-center border border-black/40 max-w-3xl mx-auto">
{/* --- Single expandable warning --- */}
<div className="mt-1 text-center">


</div>

<div className="flex items-center justify-left gap-3 mb-2 mt-4">
{/* Profile header row */}



<div className="flex items-center mb-4 w-full relative">
  {/* Left side: avatar + name */}
  <div className="flex items-center gap-3">
    <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      </svg>
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-800 text-left">{selectedProfile.name}</h2>
      <p className="text-sm text-gray-600 font-mono text-left mt-1">
        {selectedProfile.address ? (
          <>
            <span className="select-all block">
              {selectedProfile.address.slice(0, 10)}…{selectedProfile.address.slice(-10)}
            </span>
          </>
        ) : (
          "—"
        )}
      </p>
    </div>
  </div>

  {/* Right side: Share + Sign In */}
<div className="flex items-start gap-2 absolute right-0 top-0 ">

    {/* Share button */}
   
 <button
      onClick={() => {
        const shareUrl = `${window.location.origin}/${encodeURIComponent(selectedProfile.name)}`;
        if (navigator.share) {
          navigator.share({
            title: `${selectedProfile.name} on Zcash.me`,
            text: "Check out this Zcash profile:",
            url: shareUrl,
          }).catch(() => {});
        } else {
          navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      className="flex items-center gap-1 border rounded-lg h-7 w-20 px-4 py-2 text-xs border-gray-400 hover:border-yellow-500 text-gray-600 transition-all duration-200"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4m0 0L8 6m4-4v16" />
      </svg>
      <span>Share</span>
    </button>

  </div>
</div>

</div>

<p className="text-xs text-gray-400 mb-5 text-left ml-[3.75rem]">
  Joined {" "}
  {selectedProfile.since
    ? new Date(selectedProfile.since).toLocaleString("default", { month: "short", year: "numeric" })
    : "NULL"}
  {" "}
  • Last active{" "}
  {selectedProfile.last_signed_at
    ? new Date(selectedProfile.last_signed_at).toLocaleString("default", { month: "short", year: "numeric" })
    : "NULL"}
  {" "}
  • Good thru{" "}
  {selectedProfile.good_thru
    ? new Date(selectedProfile.good_thru).toLocaleString("default", { month: "short", year: "numeric" })
    : "NULL"}
</p>

{/* Action Buttons: Copy, Show QR, Share */}
{/* Action Buttons: Copy, Show QR, Share */}
<div className="flex flex-wrap justify-center gap-2 mt-3 mb-4">
  {/* Copy Uaddr */}
  <button
    onClick={() => {
      navigator.clipboard.writeText(selectedProfile.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }}
    className={`flex items-center gap-1 border rounded-xl h-7 px-3 py-1.5 text-sm transition-all duration-200 ${
      copied
        ? ""
        : "border-gray-400 hover:border-blue-500 text-gray-700"
    }`}
  >
    {copied ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    )}
    <span>Copy Uaddr</span>
  </button>

  {/* Show QR */}
  <button
    onClick={() => {
      setForceShowQR(true);
      requestAnimationFrame(() => {
        const qrSection = document.getElementById("zcash-feedback");
        if (qrSection) {
          setTimeout(() => {
            qrSection.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      });
      setQRShown(true);
      setTimeout(() => setQRShown(false), 1500);
    }}
    className={`flex items-center gap-1 border rounded-xl px-3 h-7 py-1.5 text-sm transition-all duration-200 ${
      qrShown
        ? ""
        : "border-gray-400 hover:border-blue-500 text-gray-700"
    }`}
  >
    {qrShown ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h4v4H3V3zM3 17h4v4H3v-4zM17 3h4v4h-4V3zM17 17h4v4h-4v-4z" />
      </svg>
    )}
    <span>Show QR</span>
  </button>
{/* Show Links */}
{/* Show Links */}

  <button
onClick={() => {
  setShowLinks((prev) => !prev);
  setLinksShown(true);
  setTimeout(() => setLinksShown(false), 1500);
}}
className={`flex items-center gap-1 border rounded-xl px-3 py-1.5 h-7 text-sm transition-all duration-200 ${
  linksShown
    ? ""
    : "border-gray-400 hover:border-blue-500 text-gray-700"
}`}

  >
{linksShown ? (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2 2 2m0 0l-2-2-2 2m2-2v6m0-8V4" />
  </svg>
)}
<span>{showLinks ? "Hide Links" : "Show Links"}</span>

  </button>

  {showLinks && (
    <div className="mt-4 w-full border border-black/30 rounded-2xl p-4 text-sm text-gray-700 bg-transparent shadow-sm animate-fadeIn">
      <div className="grid grid-cols-3 gap-2 items-center text-left border-b pb-2 mb-2">
        <button className="flex items-center gap-2 text-blue-700 font-semibold hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.54 6.42c-.81.36-1.68.6-2.59.71a4.5 4.5 0 001.98-2.48 9.1 9.1 0 01-2.86 1.1 4.52 4.52 0 00-7.7 4.13A12.84 12.84 0 013 4.79a4.5 4.5 0 001.4 6.04 4.4 4.4 0 01-2.05-.56v.06a4.52 4.52 0 003.63 4.43 4.6 4.6 0 01-2.04.08 4.52 4.52 0 004.22 3.13A9.07 9.07 0 012 19.54a12.77 12.77 0 006.93 2.03c8.32 0 12.87-6.9 12.87-12.88 0-.2 0-.41-.02-.61a9.18 9.18 0 002.25-2.34z" />
          </svg>
          Twitter
        </button>

<div className="flex items-center justify-start gap-2">
  <button
    onClick={() => navigator.clipboard.writeText("https://twitter.com/zcashme")}
    className="text-gray-400 hover:text-blue-600"
    title="Copy link"
  >
    ⧉
  </button>
  <a
    href="https://twitter.com/zcashme"
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 truncate hover:underline"
  >
    /zcashme
  </a>
</div>

        <div className="text-green-600 font-semibold flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Verified
        </div>
      </div>
<div className="grid grid-cols-3 gap-2 items-center text-left">
  <button className="flex items-center gap-2 text-blue-700 font-semibold hover:underline">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.478 2 12a10 10 0 0015.546 8.032l4.452 1.196-1.196-4.452A10 10 0 0012 2z" />
    </svg>
    Signal
  </button>

  <div className="flex items-center justify-start gap-2">
    <button
      onClick={() => navigator.clipboard.writeText("https://signal.group/#CjQKIKDM76KMttnFqmbtbKzcfDrGeLtR6wWQq82YM8LWdyNhEhBGKNSZVjTREwDLqhatYhLH")}
      className="text-gray-400 hover:text-blue-600"
      title="Copy link"
    >
      ⧉
    </button>
    <a
      href="https://signal.group/#CjQKIKDM76KMttnFqmbtbKzcfDrGeLtR6wWQq82YM8LWdyNhEhBGKNSZVjTREwDLqhatYhLH"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 truncate hover:underline"
    >
      /#CjQKIKDM76KMttnFqmbtbKzcfDrGeLtR6wWQq82YM8LWdyNhEhBGKNSZVjTREwDLqhatYhLH
    </a>
  </div>

  <div className="text-red-500 font-semibold flex items-center gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Unverified
  </div>
</div>

    </div>
  )}
</div>




    {/* ⚠ Warning message (left) */}
    <div className="text-xs text-red-400 bg-red-50 border border-red-200 rounded-md px-3 py-1">
      ⚠ <strong>{selectedProfile.name}</strong> may not be who you think.
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="ml-2 text-blue-600 hover:underline text-xs font-semibold"
      >
        {showDetail ? "Hide" : "More"}
      </button>
      {showDetail && (
        <span className="block mt-1 text-red-400">
          {selectedProfile.name} added 0 links of which 0 are verified.
        </span>
      )}
    </div>



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
