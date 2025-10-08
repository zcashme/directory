import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
import { useFeedback } from "./store";
import Toast from "./Toast"; // 🟢 add this line
import writeIcon from "./assets/write.svg"; // ✎ feedback form icon
import bookOpen from "./assets/book-open.svg"; // 📖 new icon (expanded)
import bookClosed from "./assets/book-closed.svg"; // 📕 new icon (collapsed)


export default function Directory() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [showLetterGrid, setShowLetterGrid] = useState(false);
const [showStats, setShowStats] = useState(true);
const [showDirectory, setShowDirectory] = useState(true); // (already present in your file)
const [showFullAddr, setShowFullAddr] = useState(false);  // 👈 new: toggle full/short address

  const alphaRef = useRef(null);
  const searchBarRef = useRef(null);
// Auto-show A–Z tray on scroll, hide after ~2.8s of inactivity
const [showAlpha, setShowAlpha] = useState(false);
const idleRef = useRef(null);
const [showDirLabel, setShowDirLabel] = useState(true);

// Show stats again if address resets to admin feedback mode

useEffect(() => {
  if (!showDirectory) {
    setShowDirLabel(true);
    const t = setTimeout(() => setShowDirLabel(false), 4000);
    return () => clearTimeout(t);
  }
}, [showDirectory]);


useEffect(() => {
  const show = () => {
    setShowAlpha(true);
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setShowAlpha(false), 2800); // 2.8s fade window
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

const { setSelectedAddress, selectedAddress } = useFeedback(); // include current selection
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

      if (error) console.error(error);
      else setProfiles(data || []);
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

  const totalCount = profiles.length;
  const earliestDate = profiles.length
    ? new Date(Math.min(...profiles.map((p) => new Date(p.since))))
    : null;
  const claimedCount = profiles.filter((p) => p.status_computed === "claimed").length;
  const socialVerifiedCount = profiles.filter((p) => !!p.last_signed_at).length;

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

  const selectedProfile = profiles.find((p) => p.address === selectedAddress);

if (loading) return <p className="text-center mt-8">Loading directory…</p>;

  return (
<div className="relative max-w-3xl mx-auto p-4 pb-24 pt-20">
      {/* --- Fixed Join button --- */}
      <button
        onClick={() => setIsJoinOpen(true)}
        className="fixed top-3 right-4 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 transition-all animate-pulse hover:scale-110 z-50"
        style={{
          animation: "pulseJoin 2.5s infinite",
        }}
      >
        ＋ Join
      </button>

        {/* --- Header stats --- */}
        {showStats && showDirectory && <ZcashStats />}

        {/* --- Fixed Header row --- */}
        {/* --- Fixed Header row (responsive & pinned toggle) --- */}
        <div
        ref={searchBarRef}
        className="fixed top-0 left-0 right-0 bg-transparent backdrop-blur-sm z-40 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-4 py-2"
        >
        <div className="flex items-center gap-2 min-w-0 flex-1">
            <a href="/" className="font-bold text-lg whitespace-nowrap">
            Zcash.me/
            </a>
            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search names"
                className="flex-1 rounded-lg px-3 py-2 text-sm border-0 bg-transparent/60 focus:bg-white outline-none focus:ring-2 focus:ring-blue-200"
                />

        </div>

        <button
            onClick={() => setShowStats((prev) => !prev)}
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition whitespace-nowrap"
        >
            {showStats ? "Hide Stats" : "Show Stats"}
        </button>
        </div>



      {/* --- Directory list --- */}
      {showDirectory &&
  letters.map((letter) => (
        <div key={letter} id={`letter-${letter}`} className="mb-6">
          <h2
  className="text-lg font-semibold text-gray-700 mb-2 cursor-pointer hover:text-blue-600 transition"
  onClick={() => setShowLetterGrid(true)}
>
  {letter}
</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {grouped[letter].map((p) => (
              <div
                key={p.name}
                className="relative border rounded-xl p-3 shadow-sm hover:shadow-md transition bg-transparent cursor-pointer"
                onClick={(e) => {
                    // Avoid triggering when the user clicks the name link
                    if (e.target.tagName.toLowerCase() === "a") return;
                    setSelectedAddress(p.address);
                    setShowDirectory(false); // 🔻 collapse directory
                    document
                    .getElementById("zcash-feedback")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                >

                {/* --- Top-right icons  deleted --- */}
                {() => {
                setSelectedAddress(p.address);
                setShowDirectory(false); // 🔻 collapse directory
                document
                    .getElementById("zcash-feedback")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}


                {/* --- Card content --- */}
                <a
                  href={`/${p.name}`}
                  className="font-medium text-blue-700 hover:underline truncate"
                >
                  {p.name}
                </a>
                <div className="text-xs text-gray-600 mt-1">
                  <span
                    className={
                      p.status_computed === "claimed"
                        ? "text-green-600"
                        : "text-red-500"
                    }
                  >
                    {p.status_computed}
                  </span>{" "}
                  • since {new Date(p.since).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* --- Alphabet bar with search icon --- */}
<div
  ref={alphaRef}
  className={`fixed right-2 top-1/4 flex flex-col items-center select-none z-40 transition-opacity duration-500 ease-out
    ${showAlpha ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
  onTouchStart={(e) => handleAlphaTouch(e.touches[0].clientY)}
  onTouchMove={(e) => {
    e.preventDefault();
    handleAlphaTouch(e.touches[0].clientY);
  }}
>
  {[..."🔍", ...letters].map((l) => (
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



      {/* --- Floating letter indicator --- */}
      {activeLetter && activeLetter !== "🔍" && (
        <div className="fixed right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2 bg-gray-800 text-white text-4xl font-bold rounded-2xl px-6 py-4 opacity-90">
          {activeLetter}
        </div>
      )}
{showLetterGrid && (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    onClick={() => setShowLetterGrid(false)}
  >
    <div
      className="grid grid-cols-5 gap-4 text-white text-4xl font-bold text-center select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search symbol at top-left */}
      <button
        onClick={() => {
          setShowLetterGrid(false);
          scrollToLetter("⌕");
        }}
        className="hover:text-yellow-400 active:scale-125 transition-transform"
        title="Search"
      >
        ⌕
      </button>

      {/* All other letters */}
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

      {/* --- AddUserForm modal --- */}
      <AddUserForm
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={() => {
          setIsJoinOpen(false);
          window.location.reload();
        }}
      />

{/* --- Selected user summary (only when directory is collapsed and a known profile is selected) --- */}
{/* --- Selected user summary (only when directory collapsed and not feedback mode) --- */}
{!showDirectory && selectedProfile && selectedProfile.address !== "u1s6qvd4lfrrvjkr9xp8kpgjsrfr5azw0mum8xvcs2286fn4u6ugqsyh5h2r24peg4kqaxfvrullqnkry48crqw60w7lczhl2sthh57k433lnya9dr6lz5u8cj3ckfy9lzplnsvhfect0g3y87rf69r8pxpt7hh8pr7lkwegmxzez8aeguqwhdrtnj83mfg443msyuvaqx7nnry6q3j7q" && (
  <div className="mt-6 mb-2 p-4 rounded-xl bg-transparent animate-fadeIn text-center">
    {/* Name */}
    <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedProfile.name}</h2>

    {/* Address (static, shortened only) */}
    <p className="text-sm text-gray-700 font-mono mb-2">
      {selectedProfile.address
        ? `${selectedProfile.address.slice(0, 10)}…${selectedProfile.address.slice(-10)}`
        : "—"}
    </p>

    {/* Since / activity dates */}
    <p className="text-xs text-gray-500 mb-3">
      Since{" "}
      {selectedProfile.since
        ? new Date(selectedProfile.since).toLocaleDateString()
        : "—"}
      {selectedProfile.last_signed_at && (
        <> • Last active {new Date(selectedProfile.last_signed_at).toLocaleDateString()}</>
      )}
      {selectedProfile.good_thru && (
        <> • Good thru {new Date(selectedProfile.good_thru).toLocaleDateString()}</>
      )}
    </p>

    {/* Social media placeholders */}
    <div className="flex justify-center gap-4 mb-3">
      {[
        { name: "Twitter", verified: false },
        { name: "GitHub", verified: false },
        { name: "Mastodon", verified: false },
      ].map((s) => (
        <div
          key={s.name}
          className="flex flex-col items-center text-xs text-gray-600"
        >
          <div
            className={`w-10 h-10 flex items-center justify-center rounded-full border ${
              s.verified
                ? "border-green-500 text-green-600"
                : "border-red-400 text-red-500"
            }`}
          >
            {s.verified ? "✔" : "✖"}
          </div>
          <span className="mt-1">{s.name}</span>
        </div>
      ))}
    </div>

    {/* Warning banner */}
    <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 inline-block max-w-sm mx-auto">
      ⚠ 0 social media accounts associated with this Zcash address.
      <br />
      <strong>{selectedProfile.name}</strong> may not be who you think it is.
      <br />
      <span className="text-blue-600 underline font-medium cursor-default">
        Is this your address? Verify
      </span>
    </div>
  </div>
)}


{/* --- Feedback section --- */}
<div id="zcash-feedback">
  <ZcashFeedback />
</div>


{/* --- Floating Directory toggle button & label (right-aligned label) --- */}
<div className="fixed bottom-6 left-6 z-[9999]">
  <div className="relative">
    {/* Circle toggle button */}
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

    {/* Label floats to the right of the button */}
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




<Toast
  message={toastMsg}
  show={showToast}
  onClose={() => setShowToast(false)}
/>

      {/* --- Animation keyframes --- */}
      <style>
        {`
        @keyframes pulseJoin {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
          
        }
        `}
      </style>
    </div>
  );
}
