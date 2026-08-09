import { useState, useCallback, useMemo } from "react";

// ── Constants (matching directory ProfileCard.tsx) ──────────────────────────

const AVATAR_SIZE = 120;
const AVATAR_SPACER = 64;
const CARD_TOP_MARGIN = 64;
const CARD_OFFSET_Y = 7;
const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));

// ── Platform config (inline from directory usernameNormalizer) ──────────────

const PLATFORM_OPTIONS = [
  { key: "X", label: "X (Twitter)" },
  { key: "GitHub", label: "GitHub" },
  { key: "Instagram", label: "Instagram" },
  { key: "Reddit", label: "Reddit" },
  { key: "LinkedIn", label: "LinkedIn" },
  { key: "Discord", label: "Discord" },
  { key: "TikTok", label: "TikTok" },
  { key: "Mastodon", label: "Mastodon" },
  { key: "Bluesky", label: "Bluesky" },
  { key: "Snapchat", label: "Snapchat" },
  { key: "Telegram", label: "Telegram" },
  { key: "PGPZ", label: "PGPZ Code" },
  { key: "Other", label: "Other (custom URL)" },
];

const PLATFORM_URL_BASES: Record<string, { base: string; prefix?: string }> = {
  X: { base: "https://x.com/" },
  GitHub: { base: "https://github.com/" },
  Instagram: { base: "https://instagram.com/" },
  Reddit: { base: "https://reddit.com/user/" },
  LinkedIn: { base: "https://linkedin.com/in/" },
  Discord: { base: "https://discord.com/users/" },
  TikTok: { base: "https://tiktok.com/", prefix: "@" },
  Mastodon: { base: "https://mastodon.social/", prefix: "@" },
  Bluesky: { base: "https://bsky.app/profile/" },
  Snapchat: { base: "https://snapchat.com/add/" },
  Telegram: { base: "https://t.me/" },
  PGPZ: { base: "https://community.pgpz.org/challenge/" },
};

function buildSocialUrl(platform: string, username: string): string {
  if (!username.trim()) return "";
  const config = PLATFORM_URL_BASES[platform];
  if (!config) return "";
  const prefix = config.prefix ?? "";
  return `${config.base}${prefix}${username.trim()}`;
}

function normalizeSocialUsername(raw: string): string {
  let v = raw.trim();
  v = v.replace(/^https?:\/\//i, "");
  v = v.replace(/^@+/, "");
  v = v.replace(/["'\\]+/g, "");
  // Strip common social domains
  v = v.replace(/^(www\.)?(x\.com|twitter\.com|github\.com|instagram\.com|reddit\.com|linkedin\.com|discord\.com|discordapp\.com|tiktok\.com|mastodon\.social|bsky\.app|snapchat\.com|t\.me|telegram\.me|community\.pgpz\.org)\//i, "");
  v = v.replace(/^\/+/, "");
  v = v.replace(/^(user|users|in|profile|add|challenge)\//i, "");
  v = v.split("?")[0].split("#")[0];
  v = v.split("/")[0];
  v = v.replace(/\/+$/, "");
  v = v.replace(/[@\s]/g, "");
  return v;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileLink {
  id: number;
  url: string;
  label: string;
  platform: string;
  is_verified: boolean;
}

/** Extended link type for the editor — adds username/otherUrl for the platform picker */
interface EditableLink extends ProfileLink {
  username: string;
  otherUrl: string;
  _delete?: boolean;
}

interface ProfileData {
  address: string;
  name: string;
  display_name: string;
  bio: string;
  profile_image_url: string;
  nearest_city_name: string;
  address_verified: boolean;
  id: number;
  links: ProfileLink[];
  memo: string;
  qr: string;
}

interface Edits {
  display_name: string;
  bio: string;
  links: EditableLink[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

/** Detect platform from a stored URL */
function detectPlatformFromUrl(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "Other";
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const host = new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
    for (const [platform, config] of Object.entries(PLATFORM_URL_BASES)) {
      const baseHost = new URL(config.base).hostname.toLowerCase().replace(/^www\./, "");
      if (host === baseHost) return platform;
    }
  } catch {}
  return "Other";
}

/** Convert a stored ProfileLink into an EditableLink with parsed platform/username */
function toEditableLink(link: ProfileLink): EditableLink {
  const platform = detectPlatformFromUrl(link.url);
  if (platform === "Other") {
    return { ...link, username: "", otherUrl: link.url };
  }
  const username = normalizeSocialUsername(link.url);
  return { ...link, platform, username, otherUrl: "" };
}

/** Convert an EditableLink back to the URL + label for submission */
function resolveEditableLinkUrl(link: EditableLink): { url: string; label: string } {
  if (link.platform === "Other") {
    const url = link.otherUrl.trim();
    return { url, label: url ? extractDomain(url) : "" };
  }
  const url = buildSocialUrl(link.platform, link.username);
  const label = link.username.trim() ? normalizeSocialUsername(link.username) : "";
  return { url, label };
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const uid = window.location.pathname.split("/").pop() || "";

  // INFERRED STATE
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [original, setOriginal] = useState<Edits | null>(null);
  const [edits, setEdits] = useState<Edits>({
    display_name: "",
    bio: "",
    links: [],
  });

  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resolveUsername = useCallback(async (username: string) => {
    setLoading(true);
    setError("");
    const endpoint = uid === "demo" ? "/demo" : `/interaction/${uid}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "resolve", username }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setProfile(data);
      const editableLinks = (data.links || []).map((l: ProfileLink) => toEditableLink(l));
      const snapshot: Edits = {
        display_name: data.display_name || "",
        bio: data.bio || "",
        links: editableLinks.map((l: EditableLink) => ({ ...l })),
      };
      setOriginal(snapshot);
      setEdits({
        display_name: snapshot.display_name,
        bio: snapshot.bio,
        links: editableLinks,
      });
    } catch (err: any) {
      setError(`Error: ${err.message || err.toString()}`);
    }
    setLoading(false);
  }, [uid]);

  const verifyOTP = useCallback(async (otp: string) => {
    setLoading(true);
    setError("");
    const endpoint = uid === "demo" ? "/demo" : `/interaction/${uid}`;
    try {
      // Resolve final URLs from editable links
      const resolvedLinks = edits.links
        .map(l => {
          if (l._delete && l.id) {
            return { id: l.id, url: l.url, label: l.label, platform: l.platform, _delete: true };
          }
          if (l.is_verified) return { id: l.id, url: l.url, label: l.label, platform: l.platform, _delete: false };
          const { url, label } = resolveEditableLinkUrl(l);
          return { id: l.id || undefined, url, label, platform: l.platform, _delete: false };
        })
        // Keep deletion records even though they do not need a URL. Empty new
        // rows are simply ignored.
        .filter(l => l._delete || l.url.trim());

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        body: new URLSearchParams({
          action: "verify",
          otp,
          memo: profile?.memo || "",
          profile_edits: JSON.stringify({
            display_name: edits.display_name.trim() || null,
            bio: edits.bio.trim() || null,
            links: resolvedLinks,
          }),
        }),
      });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      if (!res.ok) {
        setError(await res.text());
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setIsVerified(true);

      if (data.isDemo) {
        setTimeout(() => { window.location.href = "/demo"; }, 2500);
      }
    } catch {
      setError("Verification failed.");
      setLoading(false);
    }
  }, [uid, profile, edits]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden font-sans transition-colors duration-500 bg-[#faf6ed] flex flex-col pt-10">
      <div className="relative w-full max-w-[460px] mx-auto p-4 pb-24 flex flex-col">
        {!profile && !isVerified && (
          <IdentifyStep onResolve={resolveUsername} loading={loading} error={error} isDemo={uid === "demo"} />
        )}
        {profile && !isVerified && original && (
          <ChallengeForm
            profile={profile}
            original={original}
            edits={edits}
            setEdits={setEdits}
            onVerify={verifyOTP}
            onReset={() => setProfile(null)}
            loading={loading}
            error={error}
          />
        )}
        {isVerified && <RedirectingStep />}
      </div>
    </div>
  );
}

// ── Identify Step ──────────────────────────────────────────────────────────

function IdentifyStep({ onResolve, loading, error, isDemo }: {
  onResolve: (username: string) => void;
  loading: boolean;
  error: string;
  isDemo?: boolean;
}) {
  const [username, setUsername] = useState("");
  const title = isDemo ? "Try ZcashMe — Live Demo" : "Sign in";

  return (
    <div className="w-full relative overflow-visible mx-auto mb-8 p-8 animate-fadeIn text-center rounded-[26px] border border-gray-300 bg-white shadow-inner flex flex-col items-center justify-start">
      {isDemo && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-red-50 border border-red-300 text-red-600 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-sm z-10">
          ⚠ Warning: this is a demo
        </div>
      )}
      <div className="mb-8 flex flex-col items-center mt-2">
        <img src="https://zcash.me/assets/icons/zcashme-logo.svg" alt="Zcash.me" className="w-12 h-12 mb-4" />
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
        <p className="text-sm text-gray-500 mt-2">Authenticate with your profile</p>
      </div>
      <input
        type="text"
        placeholder="username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="w-full px-4 py-3.5 text-sm text-center font-medium border border-gray-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner"
        autoComplete="off"
        autoFocus
        onKeyDown={e => e.key === "Enter" && onResolve(username)}
      />
      <div className="text-red-500 text-xs mt-2 h-4 font-medium">{error}</div>
      <button
        className="w-full bg-blue-700 text-white rounded-xl py-3.5 text-sm font-semibold mt-2 hover:bg-blue-800 transition-all disabled:opacity-50 shadow-md flex justify-center items-center h-12"
        disabled={loading || !username.trim()}
        onClick={() => onResolve(username)}
      >
        {loading ? <Spinner /> : "Continue"}
      </button>
      <div className="mt-8 pt-5 border-t border-gray-100 w-full">
        <p className="text-sm text-gray-500">
          Don't have a Zcash.me account? <br />
          <a href="https://zcash.me" target="_blank" className="text-blue-700 font-semibold hover:text-blue-800 mt-1 inline-block">Create one</a>
        </p>
      </div>
    </div>
  );
}

// ── Per-field Reset Button ─────────────────────────────────────────────────

function FieldResetButton({ dirty, onReset }: { dirty: boolean; onReset: () => void }) {
  if (!dirty) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center whitespace-nowrap text-xs font-normal text-green-700 hover:underline"
    >
      ⌦ Reset
    </button>
  );
}

// ── Challenge Form (Profile Editor + Verification) ─────────────────────────

function ChallengeForm({ profile, original, edits, setEdits, onVerify, onReset, loading, error }: {
  profile: ProfileData;
  original: Edits;
  edits: Edits;
  setEdits: (fn: any) => void;
  onVerify: (otp: string) => void;
  onReset: () => void;
  loading: boolean;
  error: string;
}) {
  const [otp, setOtp] = useState("");
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const handleCopyValue = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(profile.address || "");
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const bioBytes = new TextEncoder().encode(edits.bio).length;

  // ── Dirtiness flags ────────────────────────────────────────────────────
  const isDisplayNameDirty = edits.display_name !== original.display_name;
  const isBioDirty = edits.bio !== original.bio;
  const isLinksDirty = useMemo(() => {
    if (edits.links.length !== original.links.length) return true;
    return edits.links.some((l, i) => {
      const o = original.links[i];
      return l._delete !== o._delete || l.platform !== o.platform || l.username !== o.username || l.otherUrl !== o.otherUrl || l.url !== o.url;
    });
  }, [edits.links, original.links]);

  // ── Link manipulation ──────────────────────────────────────────────────
  const addLink = () => {
    setEdits((prev: Edits) => ({
      ...prev,
      links: [...prev.links, { id: 0, url: "", label: "", platform: "X", is_verified: false, username: "", otherUrl: "" }],
    }));
  };

  const removeLink = (idx: number) => {
    setEdits((prev: Edits) => ({
      ...prev,
      links: prev.links.flatMap((link: EditableLink, i: number) => {
        if (i !== idx) return [link];
        // Preserve persisted links as an explicit deletion for the server.
        // A newly added link has no database row and can be discarded.
        return link.id ? [{ ...link, _delete: true }] : [];
      }),
    }));
  };

  const updateLinkField = (idx: number, patch: Partial<EditableLink>) => {
    setEdits((prev: Edits) => ({
      ...prev,
      links: prev.links.map((l: EditableLink, i: number) => {
        if (i !== idx) return l;
        const updated = { ...l, ...patch };
        // Re-derive url + label when platform/username/otherUrl changes
        const { url, label } = resolveEditableLinkUrl(updated);
        return { ...updated, url, label };
      }),
    }));
  };

  // ── Per-field reset handlers ───────────────────────────────────────────
  const resetDisplayName = () => setEdits((prev: Edits) => ({ ...prev, display_name: original.display_name }));
  const resetBio = () => setEdits((prev: Edits) => ({ ...prev, bio: original.bio }));
  const resetLinks = () => setEdits((prev: Edits) => ({ ...prev, links: original.links.map(l => ({ ...l })) }));

  return (
    <>
      <div style={{ transform: `translateY(${AVATAR_OVERLAP_Y}px)`, marginTop: CARD_TOP_MARGIN + CARD_OFFSET_Y }}>
        <div className="relative overflow-visible mx-auto mb-8 p-6 animate-fadeIn text-center w-full rounded-[26px] border border-gray-300 bg-white text-gray-900 shadow-inner">

          <div
            className="absolute z-10 flex items-center justify-between"
            style={{ top: ACTION_BUTTONS_TOP, left: 16, right: 16 }}
          >
            <button
              onClick={onReset}
              className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
              title="Change Account"
            >
              ← Change
            </button>
          </div>

          <div
            className="absolute left-1/2 top-0 z-20 transition-all duration-300"
            style={{ transform: `translate(-50%, calc(-50% - ${AVATAR_OVERLAP_Y}px))` }}
          >
            <ProfileAvatar profile={profile} size={AVATAR_SIZE} borderColor="var(--color-maxi-border)" />
          </div>

          <div style={{ paddingTop: `${AVATAR_SPACER}px` }} aria-hidden />

          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-3 mb-1">
            Logging in as @{profile.name}
          </div>

          {/* Profile Form */}
          <div className="mt-1 flex w-full flex-col items-center px-4">
            {/* Display Name */}
            <div className="w-full flex items-center justify-end mb-1">
              <FieldResetButton dirty={isDisplayNameDirty} onReset={resetDisplayName} />
            </div>
            <div className="max-w-full text-center inline-flex items-center justify-center gap-2 flex-wrap">
              <input
                type="text"
                value={edits.display_name}
                onChange={e => setEdits((prev: Edits) => ({ ...prev, display_name: e.target.value }))}
                placeholder="Display Name"
                maxLength={32}
                className="w-full text-center bg-transparent border-b border-dashed border-gray-300 outline-none text-gray-900 text-3xl font-black leading-tight max-w-[90%] placeholder-gray-300 focus:border-blue-400 transition-colors"
              />
              {profile.address_verified && <VerifiedBadge verified={true} />}
            </div>
          </div>

          {/* Bio */}
          <div className="w-full px-6 mt-1.5 relative">
            <div className="flex items-center justify-end mb-1">
              <FieldResetButton dirty={isBioDirty} onReset={resetBio} />
            </div>
            <textarea
              value={edits.bio}
              onChange={e => setEdits((prev: Edits) => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell the world about yourself"
              maxLength={100}
              rows={2}
              className="w-full text-center bg-gray-50/50 hover:bg-gray-50 focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-[13px] text-gray-600 outline-none transition-all resize-none shadow-sm"
            />
            <div className={`text-[10px] text-right mt-0.5 ${bioBytes > 90 ? 'text-orange-500' : 'text-gray-400'}`}>
              {bioBytes}/100
            </div>
          </div>

          {/* Address (read-only) */}
          <div className="mt-2.5 flex items-center justify-center px-4 w-full">
            <div className="relative flex items-center gap-2 border border-gray-200 bg-gray-50 hover:bg-white transition-colors text-gray-700 font-mono text-[11px] rounded-full pl-3 pr-1 py-1 shadow-xs w-full max-w-[90%]">
              <input
                type="text"
                value={profile.address || ""}
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-gray-600 truncate"
              />
              <button
                type="button"
                onClick={copyAddress}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Copy Address"
              >
                {copiedAddr ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Links */}
          <div
            className="relative flex flex-col items-center w-full mx-auto rounded-2xl border border-gray-300 bg-white/80 shadow-inner transition-all overflow-hidden mt-5 pb-0"
            style={{ maxWidth: 404 }}
          >
            <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
              <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Links</span>
                  <FieldResetButton dirty={isLinksDirty} onReset={resetLinks} />
                </div>
                {edits.links.map((link, idx) => !link._delete && (
                  <LinkRow
                    key={link.id || idx}
                    link={link}
                    editable={!link.is_verified}
                    onRemove={() => removeLink(idx)}
                    onPlatformChange={platform => updateLinkField(idx, { platform, username: "", otherUrl: "" })}
                    onUsernameChange={username => updateLinkField(idx, { username })}
                    onOtherUrlChange={otherUrl => updateLinkField(idx, { otherUrl })}
                  />
                ))}
                <button
                  onClick={addLink}
                  className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors mt-1 text-left inline-flex items-center gap-1 w-max"
                >
                  <span className="text-lg leading-none">+</span> Add Link
                </button>
              </div>
            </div>
          </div>

          {/* Start Verification / Verification Section */}
          <div className="w-full mt-8 px-4 flex flex-col items-center">
            <div className="w-full h-px bg-gray-200 mb-6 max-w-[404px]" />

            {!showVerification ? (
              <button
                onClick={() => setShowVerification(true)}
                className="w-full max-w-[404px] rounded-xl border border-green-700/60 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 shadow-xs transition-all hover:border-green-700 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/35 focus-visible:ring-offset-1"
              >
                Start Verification
              </button>
            ) : (
              <>
                <h3 className="text-md font-black text-gray-900 tracking-tight mb-4">Verify Identity</h3>

                <div className="flex flex-col items-center p-4 relative bg-[rgba(252,253,253,0.92)] border border-[rgba(34,36,38,0.12)] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-[rgba(255,255,255,0.4)] backdrop-blur-md max-w-sm mx-auto w-full">
                  <div
                    className="relative group p-4 rounded-xl bg-white shadow-sm border border-[rgba(34,36,38,0.06)] hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setQrEnlarged(true)}
                    title="Click to enlarge"
                  >
                    <img className="transition-all" src={profile.qr} alt="QR" style={{ width: 140, height: 140 }} />
                    <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <span className="bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">Enlarge</span>
                    </div>
                  </div>

                  <div className="w-full space-y-2 mt-4">
                    <PaymentDetailRow
                      label="Address"
                      value={profile.address}
                      title="No address"
                      onCopy={() => handleCopyValue("address", profile.address)}
                      copied={copiedField === "address"}
                    />
                    <PaymentDetailRow
                      label="Amount"
                      value="0.002 ZEC"
                      title="No amount"
                      onCopy={() => handleCopyValue("amount", "0.002")}
                      copied={copiedField === "amount"}
                    />
                    <PaymentDetailRow
                      label="Memo"
                      value={profile.memo}
                      title="No memo"
                      onCopy={() => handleCopyValue("memo", profile.memo)}
                      copied={copiedField === "memo"}
                    />
                  </div>

                  <div className="w-full mt-6 space-y-4 pt-4 border-t border-gray-100">
                    <p className="text-center text-[11px] font-medium text-gray-600 px-6">
                      Send payment, then enter the 6-digit code.
                    </p>
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="• • • • • •"
                        className="w-full px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono border border-[rgba(34,36,38,0.15)] rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none shadow-inner bg-white"
                      />
                      <div className="text-red-500 text-[11px] h-4 font-medium text-center">{error}</div>
                      <button
                        disabled={otp.length !== 6 || loading}
                        onClick={() => onVerify(otp)}
                        className="w-full text-white rounded-xl py-3 text-sm font-bold h-11 transition-all disabled:opacity-50 shadow-md flex justify-center items-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                      >
                        {loading ? <Spinner /> : "Verify Code"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Expanded QR Modal */}
          {qrEnlarged && (
            <div className="fixed inset-0 z-[10000] flex justify-center items-center px-4 pt-10 sm:pt-0 overflow-y-auto">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQrEnlarged(false)} />
              <div className="relative my-4 flex flex-col w-full max-w-sm items-center justify-center rounded-2xl animate-fadeIn z-10 p-4">
                <div className="bg-white p-4 rounded-xl shadow-2xl">
                  <img className="transition-all w-full max-w-[320px] max-h-[320px]" src={profile.qr} alt="QR" />
                </div>
                <button onClick={() => setQrEnlarged(false)} className="mt-6 p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors font-medium text-sm">
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── Link Row ───────────────────────────────────────────────────────────────

function LinkRow({ link, editable, onRemove, onPlatformChange, onUsernameChange, onOtherUrlChange }: {
  link: EditableLink;
  editable: boolean;
  onRemove: () => void;
  onPlatformChange: (platform: string) => void;
  onUsernameChange: (username: string) => void;
  onOtherUrlChange: (otherUrl: string) => void;
}) {
  const domain = extractDomain(link.url);
  const favicon = getFavicon(link.platform, link.url);
  const isOther = link.platform === "Other";

  if (!editable) {
    // Verified links are read-only
    return (
      <div className="flex items-center gap-2.5 py-1.5 border-b border-gray-100 last:border-0 min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1.5 shrink-0 min-w-0 pl-0.5">
          {favicon ? (
            <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-xs opacity-80 flex-shrink-0" onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
          ) : (
            <div className="w-3.5 h-3.5 rounded-xs opacity-80 flex-shrink-0 bg-gray-200" />
          )}
          <span className="font-medium text-[13px] text-gray-800 truncate pl-0.5">{link.label || domain}</span>
          <VerifiedBadge verified label="Auth" />
        </div>
        <div className="flex items-center ml-auto min-w-0 text-[13px] text-gray-600 justify-end flex-1">
          <span className="flex-1 min-w-0 truncate text-right">{domain}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        {favicon ? (
          <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-xs opacity-80 flex-shrink-0" onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
        ) : (
          <div className="w-3.5 h-3.5 rounded-xs opacity-80 flex-shrink-0 bg-gray-200" />
        )}
        <select
          value={link.platform}
          onChange={e => onPlatformChange(e.target.value)}
          className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[12px] text-gray-700 outline-none focus:border-blue-400 transition-colors"
        >
          {PLATFORM_OPTIONS.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors ml-auto p-1" title="Remove Link">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="pl-6">
        {isOther ? (
          <input
            type="url"
            value={link.otherUrl}
            onChange={e => onOtherUrlChange(e.target.value)}
            placeholder="https://example.com/your-page"
            className="w-full bg-transparent border-b border-dashed border-gray-200 outline-none text-[13px] text-gray-600 placeholder-gray-400 py-1 focus:border-blue-400 transition-colors"
          />
        ) : (
          <input
            type="text"
            value={link.username}
            onChange={e => onUsernameChange(e.target.value)}
            placeholder="your_username"
            className="w-full bg-transparent border-b border-dashed border-gray-200 outline-none text-[13px] text-gray-600 placeholder-gray-400 py-1 focus:border-blue-400 transition-colors"
          />
        )}
        {link.url && (
          <div className="mt-0.5 text-[11px] text-gray-400 truncate">
            {link.url}
          </div>
        )}
      </div>
    </div>
  );
}

function getFavicon(platform: string, url: string): string {
  if (platform === "GitHub") return "https://github.githubassets.com/favicons/favicon.svg";
  if (platform === "X") return "https://abs.twimg.com/favicons/twitter.2.ico";
  if (platform === "Discord") return "https://discord.com/assets/favicon.ico";
  if (platform === "Telegram") return "https://telegram.org/img/t_logo.png";
  if (platform === "Instagram") return "https://www.google.com/s2/favicons?domain=instagram.com&sz=32";
  if (platform === "Reddit") return "https://www.google.com/s2/favicons?domain=reddit.com&sz=32";
  if (platform === "LinkedIn") return "https://www.google.com/s2/favicons?domain=linkedin.com&sz=32";
  if (platform === "TikTok") return "https://www.google.com/s2/favicons?domain=tiktok.com&sz=32";
  if (platform === "Bluesky") return "https://www.google.com/s2/favicons?domain=bsky.app&sz=32";
  if (platform === "Snapchat") return "https://www.google.com/s2/favicons?domain=snapchat.com&sz=32";
  if (platform === "Mastodon") return "https://www.google.com/s2/favicons?domain=mastodon.social&sz=32";
  if (platform === "PGPZ") return "https://www.google.com/s2/favicons?domain=community.pgpz.org&sz=32";
  if (url) {
    try {
      const d = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
      return `https://www.google.com/s2/favicons?domain=${d}&sz=32`;
    } catch {}
  }
  return "";
}

// ── Profile Avatar ─────────────────────────────────────────────────────────

function ProfileAvatar({ profile, size, borderColor }: {
  profile: { profile_image_url?: string; name?: string };
  size: number;
  borderColor: string;
}) {
  const outerSize = size + 6;
  const avatarUrl = (profile.profile_image_url || "").trim();

  return (
    <div
      className="relative rounded-full overflow-hidden shrink-0 border border-black bg-[var(--color-background)] mx-auto shadow-xs flex items-center justify-center"
      style={{ width: outerSize, height: outerSize, borderColor }}
    >
      <div className="absolute inset-[2px] rounded-full overflow-hidden flex items-center justify-center bg-[var(--color-background)]">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={profile.name || "Profile"}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <g className="animate-[avatar-blink_5s_infinite]" style={{ transformOrigin: "center" }}>
              <circle cx="24" cy="26" r="4" fill="rgba(0,0,0,0.65)" />
              <circle cx="40" cy="26" r="4" fill="rgba(0,0,0,0.65)" />
            </g>
            <path d="M24 40c3 4 13 4 16 0" stroke="rgba(0,0,0,0.65)" strokeWidth={4} strokeLinecap="round" fill="none" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ── Verified Badge ─────────────────────────────────────────────────────────

function VerifiedBadge({ verified, label = "Verified" }: { verified: boolean; label?: string }) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold tracking-wide select-none whitespace-nowrap align-middle text-green-800 bg-gradient-to-r from-green-100 to-green-200 border-green-300 shadow-xs"
      style={{ fontFamily: "inherit", fontSize: "0.625rem", padding: "0.1rem 0.3rem" }}
    >
      <span className="relative flex items-center">
        <svg className="h-3 w-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
        </svg>
      </span>
      <span>{label}</span>
    </span>
  );
}

// ── Redirecting Step ───────────────────────────────────────────────────────

function RedirectingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-20 w-full relative overflow-visible mx-auto mb-8 p-8 animate-fadeIn text-center rounded-[26px] border border-gray-300 bg-white shadow-inner">
      <div className="w-12 h-12 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin mb-6" />
      <span className="text-2xl font-black text-gray-900 tracking-tight">Verified!</span>
      <p className="text-sm text-gray-500 mt-2 font-medium">Returning to app...</p>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />;
}

// ── Payment Detail Row ─────────────────────────────────────────────────────

function PaymentDetailRow({
  label,
  value,
  title,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  title: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const labelWidthClass = "w-[64px]";
  const contentWidthClass = "w-[220px]";

  return (
    <div className="mx-auto grid w-full max-w-[348px] grid-cols-[64px_220px_64px] items-center gap-0">
      <span className={`${labelWidthClass} pr-2 text-right text-xs font-semibold text-gray-600`}>
        {label}
      </span>
      <div className={`relative min-w-0 ${contentWidthClass}`}>
        <p
          className="truncate rounded-xl border border-[rgba(34,36,38,0.12)] bg-white/60 px-3 py-2 pr-10 text-[11px] font-mono text-gray-800 shadow-sm"
          title={value || title}
        >
          {value || title}
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="absolute right-0 top-0 inline-flex h-full w-9 items-center justify-center text-gray-400 transition-all hover:text-blue-600"
          title={copied ? `${label} copied` : `Copy ${label}`}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </button>
      </div>
      <div aria-hidden className={labelWidthClass} />
    </div>
  );
}
