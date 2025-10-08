import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabase";
import AddUserForm from "./AddUserForm";
import ZcashFeedback from "./ZcashFeedback";
import ZcashStats from "./ZcashStats";
import { useFeedback } from "./store";
import Toast from "./Toast"; // 🟢 add this line


export default function Directory() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const alphaRef = useRef(null);
  const searchBarRef = useRef(null);
  const { setSelectedAddress } = useFeedback(); // 🟢 from global context
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
    if (letter === "🔍") {
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

  if (loading) return <p className="text-center mt-8">Loading directory…</p>;

  return (
    <div className="relative max-w-3xl mx-auto p-4 pb-24">
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
      <ZcashStats />

      {/* --- Header row --- */}
      <div ref={searchBarRef} className="flex items-center gap-2 mb-4">
        <a href="/" className="font-bold text-lg">
          zcash.me/
        </a>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search zcash usernames"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* --- Directory list --- */}
      {letters.map((letter) => (
        <div key={letter} id={`letter-${letter}`} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">{letter}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {grouped[letter].map((p) => (
              <div
                key={p.name}
                className="relative border rounded-xl p-3 shadow-sm hover:shadow-md transition bg-transparent"
              >
                {/* --- Top-right icons --- */}
                <div className="absolute top-2 right-2 flex gap-2">
                 {/* Copy address */}
<button
  onClick={async () => {
    await navigator.clipboard.writeText(p.address);
    showNotice("Address copied to clipboard!");
  }}
  className="text-black transition-transform hover:scale-110"
  title="Copy address"
>
  ⧉
</button>



                  {/* Draft message */}
                  <button
                    onClick={() => {
                      setSelectedAddress(p.address);
                      document
                        .getElementById("zcash-feedback")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
    className="text-black transition-transform hover:scale-110"
                    title="Draft message"
                  >
                    ✎
                  </button>
                </div>

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
        className="fixed right-2 top-1/4 flex flex-col items-center select-none"
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
            className="text-gray-500 text-sm py-0.5"
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

      {/* --- AddUserForm modal --- */}
      <AddUserForm
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={() => {
          setIsJoinOpen(false);
          window.location.reload();
        }}
      />

      {/* --- Feedback section --- */}
      <div id="zcash-feedback">
        <ZcashFeedback />
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
