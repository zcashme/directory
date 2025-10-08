import React, { useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import "./index.css";
import { useNavigate, useParams } from "react-router-dom";
import { getRandomZcasher, getTotalCount, getZcasherBySlug, slugify } from "./selectRandom";
import QRModal from "./QRModal";
import AddUserForm from "./AddUserForm";

/** Icons */

// Checkmark icon
function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Dice icon (shows random pips 1–6) */
function DiceIcon({ value = 1, ...props }) {
  // Define pip positions for each die face
  const pips = {
    1: [[12, 12]],
    2: [[7, 7], [17, 17]],
    3: [[7, 7], [12, 12], [17, 17]],
    4: [[7, 7], [7, 17], [17, 7], [17, 17]],
    5: [[7, 7], [7, 17], [12, 12], [17, 7], [17, 17]],
    6: [[7, 7], [7, 12], [7, 17], [17, 7], [17, 12], [17, 17]],
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      {pips[value]?.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="white" />
      ))}
    </svg>
  );
}

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M12 .5C5.73.5.99 5.24.99 11.51c0 4.86 3.16 8.98 7.54 10.43.55.1.75-.24.75-.53 0-.26-.01-1.14-.02-2.06-3.07.67-3.72-1.31-3.72-1.31-.5-1.27-1.22-1.6-1.22-1.6-.99-.67.08-.66.08-.66 1.09.08 1.66 1.12 1.66 1.12.98 1.67 2.57 1.19 3.2.91.1-.71.38-1.19.69-1.47-2.45-.28-5.02-1.23-5.02-5.47 0-1.21.43-2.19 1.12-2.97-.11-.28-.49-1.42.11-2.96 0 0 .92-.3 3.02 1.13.88-.24 1.83-.36 2.77-.36.94 0 1.89.12 2.77.36 2.1-1.43 3.02-1.13 3.02-1.13.6 1.54.22 2.68.11 2.96.69.78 1.12 1.76 1.12 2.97 0 4.25-2.58 5.19-5.03 5.46.39.34.73 1.01.73 2.04 0 1.47-.01 2.66-.01 3.02 0 .29.19.64.75.53 4.38-1.45 7.54-5.56 7.54-10.42C23.01 5.24 18.27.5 12 .5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function ShareIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.7 11.1l6.6-3.2M8.7 12.9l6.6 3.2" />
    </svg>
  );
}
function CopyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function QRIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6z" />
    </svg>
  );
}
function ChevronDown(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
/** Shopping (filled, like GitHub) */
function ShoppingIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 7V6a5 5 0 0 1 10 0v1h2a2 2 0 0 1 2 2l-1.3 9.1A3 3 0 0 1 16.72 21H7.28a3 3 0 0 1-2.98-2.9L3 9a2 2 0 0 1 2-2h2zm2 0h6V6a3 3 0 1 0-6 0v1z" />
    </svg>
  );
}
/** Reddit (filled, similar weight to GitHub/Shopping) */
function RedditIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20 12.5c.64 0 1.16-.52 1.16-1.16S20.64 10.2 20 10.2c-.43 0-.8.23-1 .57-1.02-.67-2.34-1.1-3.82-1.17l.66-3.1 2.15.45a1.17 1.17 0 1 0 .19-1.15l-2.76-.58a.6.6 0 0 0-.7.45l-.9 3.98c-1.58.04-3.02.48-4.09 1.18a1.16 1.16 0 1 0-1.03-.6c-1.46.75-2.38 1.88-2.38 3.15 0 2.55 3.15 4.63 7.02 4.63 3.88 0 7.02-2.08 7.02-4.63 0-.2-.03-.4-.08-.59.15-.08.33-.12.51-.12ZM9.4 13.1a1.16 1.16 0 1 1 0-2.32 1.16 1.16 0 0 1 0 2.32Zm5.2 0a1.16 1.16 0 1 1 0-2.32 1.16 1.16 0 0 1 0 2.32ZM12 17.7c-1.33 0-2.48-.47-3.23-1.2a.4.4 0 1 1 .56-.57c.57.56 1.55.93 2.67.93 1.12 0 2.1-.37 2.67-.93a.4.4 0 0 1 .56.57c-.75.73-1.9 1.2-3.23 1.2Z" />
    </svg>
  );
}
/** Yield (warning) icon */
function YieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.87 3.5a1.5 1.5 0 0 0-2.74 0L2.7 18.1A1.5 1.5 0 0 0 4.05 20.3h15.9a1.5 1.5 0 0 0 1.34-2.2L12.87 3.5zM11 9h2v5h-2V9zm0 7h2v2h-2v-2z" />
    </svg>
  );
}
/** Sun/Moon icons (kept defined; unused now) */
function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.76 4.84 5.34 3.42 3.92 4.84l1.42 1.42 1.42-1.42zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zM4.84 19.16 3.42 20.58l1.42 1.42 1.42-1.42-1.42-1.42zM20 11v2h3v-2h-3zm-2.76-6.16 1.42-1.42-1.42-1.42-1.42 1.42 1.42 1.42zM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm7.76 13.16 1.42 1.42 1.42-1.42-1.42-1.42-1.42 1.42z" />
    </svg>
  );
}
function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** Social icons (emoji-based to keep bundle light) */
function SocialIcon({ type, className = "w-4 h-4" }) {
  switch (type) {
    case "twitter":
      return <span className={className}>🐦</span>;
    case "instagram":
      return <span className={className}>📸</span>;
    case "youtube":
      return <span className={className}>▶️</span>;
    default:
      return <span className={className}>🔗</span>;
  }
}
function platformFromUrl(url = "") {
  const u = url.toLowerCase();
  if (u.includes("twitter") || u.includes("x.com")) return "twitter";
  if (u.includes("instagram")) return "instagram";
  if (u.includes("youtube") || u.includes("youtu.be")) return "youtube";
  return "generic";
}

/** Status dot */
function Pill({ color = "bg-emerald-500", title = "" }) {
  return <span title={title} className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

/** Collapse with slide/fade animation */
function Collapse({ open, children, id }) {
  return (
    <div
      id={id}
      className={`transition-all duration-300 ease-out overflow-hidden ${open ? "opacity-100" : "opacity-0"}`}
      style={{ maxHeight: open ? 480 : 0 }}
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}

/** Modal */
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white text-gray-900 shadow-xl p-5">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="text-sm text-gray-700 mb-4">{children}</div>
        <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm">Close</button>
      </div>
    </div>
  );
}

export default function ZcashProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("Unknown");
  const [nameVerified, setNameVerified] = useState(false); // address verification status
  const [address, setAddress] = useState("zs1...");
  const [sinceYear, setSinceYear] = useState("Unknown");
  const [lastSigned, setLastSigned] = useState("Unknown");
  const [count, setCount] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAuthenticateModal, setShowAuthenticateModal] = useState(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [showSocialVerifyModal, setShowSocialVerifyModal] = useState(false);
  const [socials, setSocials] = useState([]);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diceValue, setDiceValue] = useState(1);


  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2s
    } catch (e) {
      console.error("copy failed", e);
    }
  }


  useEffect(() => {
    const init = async () => {
      const total = await getTotalCount();
      setCount(total);

      if (slug) {
        const z = await getZcasherBySlug(slug);
        if (z) {
          setName(z.name || "Unknown");
          setNameVerified(!!z.name_verified);
          setAddress(z.address || "Unknown");
          setSinceYear(z.created_at ? new Date(z.created_at).getFullYear() : "Unknown");
          setLastSigned(
            typeof z.last_signed_at === "number" || typeof z.last_signed_at === "string"
              ? z.last_signed_at
              : "Unknown"
          );
          setSocials(Array.isArray(z.socials) ? z.socials : []);
        } else {
          const rz = await getRandomZcasher(total);
          if (rz) {
            setName(rz.name || "Unknown");
            setNameVerified(!!rz.name_verified);
            setAddress(rz.address || "Unknown");
            setSinceYear(rz.created_at ? new Date(rz.created_at).getFullYear() : "Unknown");
            setLastSigned(
              typeof rz.last_signed_at === "number" || typeof rz.last_signed_at === "string"
                ? rz.last_signed_at
                : "Unknown"
            );
            setSocials(Array.isArray(rz.socials) ? rz.socials : []);
            const s = rz.slug || slugify(rz.name || "");
            if (s) navigate(`/${encodeURIComponent(s)}`, { replace: true });
          }
        }
      } else {
        const z = await getRandomZcasher(total);
        if (z) {
          setName(z.name || "Unknown");
          setNameVerified(!!z.name_verified);
          setAddress(z.address || "Unknown");
          setSinceYear(z.created_at ? new Date(z.created_at).getFullYear() : "Unknown");
          setLastSigned(
            typeof z.last_signed_at === "number" || typeof z.last_signed_at === "string"
              ? z.last_signed_at
              : "Unknown"
          );
          setSocials(Array.isArray(z.socials) ? z.socials : []);
          const s = z.slug || slugify(z.name || "");
          if (s) navigate(`/${encodeURIComponent(s)}`, { replace: true });
        }
      }
    };
    init();
  }, [slug, navigate]);

  const joinRef = useRef(null);
  const [ctrlDims, setCtrlDims] = useState({ w: 36, h: 36 });
  useLayoutEffect(() => {
    function syncSizes() {
      const el = joinRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCtrlDims({
        w: Math.max(36, Math.round(rect.width / 2)),
        h: Math.max(36, Math.round(rect.height)),
      });
    }
    syncSizes();
    window.addEventListener("resize", syncSizes);
    return () => window.removeEventListener("resize", syncSizes);
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      alert("Copied");
    } catch (e) {
      console.error("copy failed", e);
    }
  }
  async function randomize() {
    const z = await getRandomZcasher(count);
    if (!z) return;

    // Optimistically hydrate UI to avoid "Unknown" flash
    setDiceValue(Math.floor(Math.random() * 6) + 1);
    setName(z.name || "Unknown");
    setNameVerified(!!z.name_verified);
    setAddress(z.address || "Unknown");
    setSinceYear(z.created_at ? new Date(z.created_at).getFullYear() : "Unknown");
    setLastSigned(
      typeof z.last_signed_at === "number" || typeof z.last_signed_at === "string"
        ? z.last_signed_at
        : "Unknown"
    );
    setSocials(Array.isArray(z.socials) ? z.socials : []);

    const s = z.slug || slugify(z.name || "");
    if (s) navigate(`/${encodeURIComponent(s)}`);
  }

  async function handleUserAdded(newUser) {
    const newCount = await getTotalCount();
    setCount(newCount);
    const s = newUser?.slug || slugify(newUser?.name || "");
    if (s) navigate(`/${encodeURIComponent(s)}`);
  }

  const verifiedCount = useMemo(() => socials.filter((s) => s.verified).length, [socials]);
  const unverifiedCount = useMemo(() => socials.filter((s) => !s.verified).length, [socials]);

  const buttonBase = "rounded-lg border flex items-center justify-center hover:bg-gray-50";

  return (
/*    <div className="min-h-screen bg-zebra text-gray-900 flex items-center justify-center p-6">*/
      <div className="min-h-screen bg-zebra text-gray-900 flex items-center justify-center p-6">
            <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl">
              {/* Header: zcash.me/ + Name */}
              <div className="flex items-center justify-center mb-5">
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    onClick={() => setShowDirectoryModal(true)}
                    className="text-left text-2xl md:text-3xl font-semibold tracking-tight hover:underline underline-offset-4"
                    aria-label="Open directory info"
                  >
                    zcash.me/
                  </button>
                  <h2 className="text-2xl md:text-3xl font-semibold truncate -ml-1" title={name}>
                    {name}
                  </h2>
                </div>
              </div>


              <div className="rounded-2xl border p-4 mb-2 flex items-start justify-between bg-transparent">
        <div className="pr-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {nameVerified ? (
              <Pill color="bg-emerald-500" title="Address verified" />
            ) : (
              <YieldIcon className="w-4 h-4 flex-none text-yellow-500" />
            )}
            <span className="font-mono text-sm truncate" title={address}>
              {address}
            </span>
            {!nameVerified && (
              <>
                <span className="h-4 w-px bg-gray-200 flex-none" aria-hidden="true" />
                <button
                  onClick={() => setShowAuthenticateModal(true)}
                  className="text-sm underline decoration-dotted whitespace-nowrap"
                >
                  Authenticate
                </button>
              </>
            )}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Since {sinceYear} · Last signed {lastSigned} · Expires Oct 2025
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyAddress}
            className={buttonBase}
            style={{ width: ctrlDims.w, height: ctrlDims.h }}
            aria-label="Copy address"
            title="Copy address"
          >
            <CopyIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setQrOpen((v) => !v)}
            className={buttonBase}
            style={{ width: ctrlDims.w, height: ctrlDims.h }}
            aria-label="Show QR"
            aria-expanded={qrOpen}
            aria-controls="qr-dropdown"
            title="Show QR"
          >
            <QRIcon className="w-5 h-5" />
          </button>
        </div>
      </div>


        {/* QR dropdown */}
        <Collapse open={qrOpen} id="qr-dropdown">
          <div className="rounded-2xl border mb-2 p-4 flex items-center justify-center bg-transparent">
            <QRModal address={address} />
          </div>
        </Collapse>


        {/* Social summary: Add social inline + divider before dropdown */}
        <div className="rounded-2xl border p-3 mb-2 flex items-center justify-between bg-transparent">
          <div className="text-sm text-gray-700 flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Pill color="bg-emerald-500" /> Verified {verifiedCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <YieldIcon className="w-4 h-4 flex-none text-yellow-500" /> Unverified {unverifiedCount}
            </span>
            <span className="h-4 w-px bg-gray-200" aria-hidden="true" />
            <button
              onClick={() => setShowSocialVerifyModal(true)}
              className="text-sm underline decoration-dotted"
              title="Add social"
            >
              Add social
            </button>
          </div>
          <button
            onClick={() => {
              setSocialsOpen((v) => !v);
              if (!socialsOpen) setShowSocialVerifyModal(true);
            }}
            className={buttonBase}
            style={{ width: ctrlDims.w, height: ctrlDims.h }}
            aria-expanded={socialsOpen}
            aria-controls="socials-dropdown"
            title="Show accounts"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform ${socialsOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>


        {/* Socials dropdown */}
        <Collapse open={socialsOpen} id="socials-dropdown">
          <div className="rounded-2xl border mb-4 divide-y bg-transparent">
            {socials.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No accounts added</div>
            )}
            {socials.map((s, idx) => {
              const type = platformFromUrl(s.url);
              return (
                <div key={idx} className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2 truncate">
                    <SocialIcon type={type} />
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate hover:underline"
                    >
                      {s.url}
                    </a>
                  </span>
                  {s.verified ? (
                    <Pill color="bg-emerald-500" title="Verified" />
                  ) : (
                    <YieldIcon className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              );
            })}
          </div>
        </Collapse>


{/* Actions row: Random + Share + Join (Join is largest) */}
<div className="w-full mb-6">
  <div className="flex items-center gap-2">
    {/* Random (equal size to Share) */}
    <button
      onClick={randomize}
      className="flex-1 rounded-2xl border py-3 text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
    >
      <DiceIcon className="w-5 h-5" value={diceValue} /> Random
    </button>


    {/* Share (equal size to Random) */}
    <button
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({
              title: name,
              text: window.location.href,
              url: window.location.href,
            });
          } else {
            await navigator.clipboard.writeText(window.location.href);
            alert("Link copied");
          }
        } catch (_) {}
      }}
      className="w-32 h-11 rounded-2xl border bg-transparent text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2"
      title="Share"
    >
      <ShareIcon className="w-4 h-4" /> <span>Share</span>
    </button>

    {/* Join (largest) */}
    <button
      ref={joinRef}
      onClick={() => setShowAddForm(true)}
      className="flex-1 h-11 rounded-2xl border bg-transparent text-sm hover:bg-gray-50 inline-flex items-center justify-center gap-2"
      title="Join"
    >
      <PlusIcon className="w-4 h-4" /> <span>Join</span>
    </button>
  </div>
</div>



        {/* Footer: ⓩ center, shop + reddit + GitHub right */}
        {/* Footer: Social icons centered, ⓩ below */}
<div className="mt-6 flex flex-col items-center text-xs text-gray-500">
  {/* Social icons row */}
  <div className="flex items-center gap-4 mb-2">
    <a
      href="https://bonfire.com/zcash"
      target="_blank"
      rel="noreferrer"
      className="text-gray-700 hover:text-black"
      aria-label="Bonfire shop"
    >
      <ShoppingIcon className="w-6 h-6" />
    </a>
    <a
      href="https://reddit.com/r/zcash"
      target="_blank"
      rel="noreferrer"
      className="text-gray-700 hover:text-black"
      aria-label="Reddit r/zcash"
    >
      <RedditIcon className="w-6 h-6" />
    </a>
    <a
      href="https://github.com/ZcashUsersGroup/zcashme"
      target="_blank"
      rel="noreferrer"
      className="text-gray-700 hover:text-black"
      aria-label="GitHub repo"
    >
      <GithubIcon className="w-6 h-6" />
    </a>
  </div>

  {/* ZDA link below */}
  <a
    href="https://zda.sh"
    target="_blank"
    rel="noreferrer"
    className="hover:underline"
  >
    ⓩ zda.sh
  </a>
</div>

      </div>

      {/* Modals */}
      <AddUserForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onUserAdded={handleUserAdded}
      />
<Modal
  isOpen={showAuthenticateModal}
  onClose={() => setShowAuthenticateModal(false)}
>
  {(() => {
    const recipient = "u1s6qvd4lfrrvjkr9xp8kpgjsrfr5azw0mum8xvcs2286fn4u6ugqsyh5h2r24peg4kqaxfvrullqnkry48crqw60w7lczhl2sthh57k433lnya9dr6lz5u8cj3ckfy9lzplnsvhfect0g3y87rf69r8pxpt7hh8pr7lkwegmxzez8aeguqwhdrtnj83mfg443msyuvaqx7nnry6q3j7q";
    const senderAddr = address || "";
    const amount = 0.001;
    const nonce = crypto.randomUUID();
    const readableMemo = `My address is ${senderAddr}. Nonce: ${nonce}. I request a verification code from zcash.me to this Zcash address. This transaction includes ${amount} ZEC to keep the lights on. Love, ${name}`;

    let memoBase64Url = "";
    try {
      memoBase64Url = btoa(readableMemo)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } catch {}

    const uri = `zcash:${recipient}?amount=${amount}&memo=${memoBase64Url}`;
    const isValid = uri.startsWith("zcash:") && memoBase64Url.length > 0;

    const [showFullUri, setShowFullUri] = React.useState(false);
    const [showCodeField, setShowCodeField] = React.useState(false);
    const [codeInput, setCodeInput] = React.useState("");

    const shortAddr = `${senderAddr.slice(0, 10)}...${senderAddr.slice(-10)}`;
    const shortUri = `${uri.slice(0, 32)}...${uri.slice(-16)}`;

    const copyUri = async () => {
      try {
        await navigator.clipboard.writeText(uri);
      } catch {}
    };

    // --- added handlers ---
    const handleCheck = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/verify/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: senderAddr, nonce }),
        });
        const data = await res.json();
        if (data.seen) {
          setShowCodeField(true);
        } else {
          alert("Your transaction hasn’t been seen yet. Please wait a bit and try again.");
        }
      } catch (err) {
        console.error(err);
        alert("Network or backend error while checking verification status.");
      }
    };

    const handleSubmitCode = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/verify/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: senderAddr, nonce, code: codeInput }),
        });
        const data = await res.json();
        if (data.verified) {
          alert("Address verified successfully!");
        } else {
          alert("Verification failed or code invalid.");
        }
      } catch (err) {
        console.error(err);
        alert("Error completing verification.");
      }
    };
    // ----------------------

    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="text-lg font-semibold">Authenticate Address</h3>
        <p className="text-sm text-gray-700 max-w-md">
          My address is {shortAddr}. I request a verification code from zcash.me
          to confirm that I control this Zcash address. This transaction includes
          0.001 ZEC to keep the lights on. Love, ${name}
        </p>

        {isValid ? (
          <>
            <div className="flex flex-col items-center gap-1">
              <a
                href={uri}
                className="text-blue-600 underline break-all max-w-md"
                target="_blank"
                rel="noreferrer"
              >
                {showFullUri ? uri : shortUri}
              </a>
              <button
                onClick={() => setShowFullUri(!showFullUri)}
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                {showFullUri ? "Hide full URI" : "Show full URI"}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={copyUri}
                className="px-3 py-1 bg-gray-200 rounded text-sm"
                title="Copy full payment URI"
              >
                Copy URI
              </button>
            </div>

            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                uri
              )}&size=350x350`}
              alt="Zcash payment QR"
              className="rounded-lg shadow mt-2"
            />

            {/* Added verification step section */}
            <div className="mt-6 text-center">
              {!showCodeField ? (
                <button
                  onClick={handleCheck}
                  className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-300"
                >
                  I sent the message
                </button>
              ) : (
                <div className="mt-4">
                  <label className="block mb-2 font-semibold text-yellow-600">
                    Enter the verification code you received
                  </label>
                  <input
                    type="text"
                    maxLength="6"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className="px-3 py-2 w-40 text-center rounded bg-gray-900 border border-yellow-400 text-yellow-100"
                  />
                  <button
                    onClick={handleSubmitCode}
                    className="ml-3 px-4 py-2 bg-green-500 text-black rounded hover:bg-green-400"
                  >
                    Submit Code
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-red-600 text-sm">Invalid payment URI.</p>
        )}
      </div>
    );
  })()}
      </Modal>
      <Modal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        title="Directory"
      >
        Coming soon — fund us on{" "}
        <a href="https://zda.sh" className="underline" target="_blank" rel="noreferrer">
          zda.sh
        </a>
        .
      </Modal>
      <Modal
        isOpen={showSocialVerifyModal}
        onClose={() => setShowSocialVerifyModal(false)}
        title="Social Media Verification"
      >
        Coming soon — fund us on{" "}
        <a href="https://zda.sh" className="underline" target="_blank" rel="noreferrer">
          zda.sh
        </a>
        .
      </Modal>
    </div>
  );
}
