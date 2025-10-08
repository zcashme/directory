import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
import { useFeedback } from "./store";

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

  const alphaRef = useRef(null);
  const searchBarRef = useRef(null);
  const [showAlpha, setShowAlpha] = useState(false);
  const idleRef = useRef(null);
  const [showDirLabel, setShowDirLabel] = useState(true);

  const { setSelectedAddress, selectedAddress } = useFeedback();

  // 🧩 NEW: sync slug to selected profile name
  useEffect(() => {
    if (!profiles.length) return;
    const match = profiles.find((p) => p.address === selectedAddress);
    if (match?.name) {
      navigate(`/${match.name}`, { replace: false });
    } else {
      navigate(`/`, { replace: false });
    }
  }, [selectedAddress, profiles, navigate]);

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
    setSelectedProfile(match || null);
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

        {showStats && showDirectory && <ZcashStats />}

        {/* --- Header --- */}
        <div
          ref={searchBarRef}
          className="fixed top-0 left-0 right-0 bg-transparent backdrop-blur-sm z-40 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-4 py-2"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <a
              href="/"
              className="font-bold text-lg whitespace-nowrap text-blue-700 hover:text-blue-800 transition-colors duration-200"
            >
              Zcash.me/
            </a>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search names"
              className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-800 placeholder-gray-400 outline-none border-none shadow-none focus:outline-none"
              style={{
                background: "transparent",
                borderBottom: "1px solid transparent",
                transition: "border-color 0.2s ease-in-out",
              }}
              onFocus={(e) => (e.target.style.borderBottom = "1px solid rgb(29, 78, 216)")}
              onBlur={(e) => (e.target.style.borderBottom = "1px solid transparent")}
            />
          </div>

          <button
            onClick={() => setShowStats((prev) => !prev)}
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition whitespace-nowrap"
          >
            {showStats ? "Hide Stats" : "Show Stats"}
          </button>
        </div>

        {/* --- Directory Cards --- */}
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
                      if (e.target.tagName.toLowerCase() === "button") return;
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
          ))}

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
                  <p className="text-sm text-gray-700 font-mono mb-2">
                    {selectedProfile.address
                      ? `${selectedProfile.address.slice(0, 10)}…${selectedProfile.address.slice(
                          -10
                        )}`
                      : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Since{" "}
                    {selectedProfile.since
                      ? new Date(selectedProfile.since).toLocaleDateString()
                      : "—"}
                    {selectedProfile.last_signed_at && (
                      <>
                        {" "}
                        • Last active{" "}
                        {new Date(selectedProfile.last_signed_at).toLocaleDateString()}
                      </>
                    )}
                    {selectedProfile.good_thru && (
                      <>
                        {" "}
                        • Good thru{" "}
                        {new Date(selectedProfile.good_thru).toLocaleDateString()}
                      </>
                    )}
                  </p>
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
