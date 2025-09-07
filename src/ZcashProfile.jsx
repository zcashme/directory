import { useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import "./index.css";
import { useNavigate, useParams } from "react-router-dom";
import { getRandomZcasher, getTotalCount, getZcasherBySlug, slugify } from "./selectRandom";
import QRModal from "./QRModal";
import AddUserForm from "./AddUserForm";

/** Icons */
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
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl">
        {/* Header: zcash.me/ + Name */}
        <div className="flex items-center justify-between mb-5">
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
          <div className="flex items-center gap-2 shrink-0">
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
              className="px-3 h-9 rounded-xl border bg-white text-sm hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <ShareIcon className="w-4 h-4" /> <span>Share</span>
            </button>

            <button
              ref={joinRef}
              onClick={() => setShowAddForm(true)}
              className="px-4 h-9 rounded-xl border bg-white text-sm hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> <span>Join</span>
            </button>
          </div>
        </div>

        {/* Address + actions (warning icon fixed size; Authenticate label) */}
        <div className="rounded-2xl border bg-white p-4 mb-2 flex items-start justify-between">
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
          <div className="rounded-2xl border bg-white mb-2 p-4 flex items-center justify-center">
            <QRModal address={address} />
          </div>
        </Collapse>

        {/* Social summary: Add social inline + divider before dropdown */}
        <div className="rounded-2xl border bg-white p-3 mb-2 flex items-center justify-between">
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
          <div className="rounded-2xl border bg-white mb-4 divide-y">
            {socials.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No accounts added</div>
            )}
            {socials.map((s, idx) => {
              const type = platformFromUrl(s.url);
              return (
                <div key={idx} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-1 min-w-0">
                    <button
                      onClick={() => setShowDirectoryModal(true)}
                      className="text-left text-2xl md:text-3xl font-semibold tracking-tight hover:underline underline-offset-4"
                      aria-label="Open directory info"
                    >
                      zcash.me/
                    </button>
                    <div className="flex items-center gap-0 min-w-0">
                      <h2 className="text-2xl md:text-3xl font-semibold truncate -ml-1" title={name}>
                        {name}
                      </h2>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAuthenticateModal(true)}
                    className="text-sm underline decoration-dotted"
                  >
                    Authenticate
                  </button>
                </div>
              );
            })}
          </div>
        </Collapse>

        {/* Random */}
        <button
          onClick={randomize}
          className="w-full rounded-2xl border py-3 text-sm font-medium hover:bg-gray-50 mb-6"
        >
          Show random Zcasher
        </button>

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
        title="Verification"
      >
        Coming soon — fund us on{" "}
        <a href="https://zda.sh" className="underline" target="_blank" rel="noreferrer">
          zda.sh
        </a>
        .
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
