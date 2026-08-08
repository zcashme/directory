import { useState, useCallback } from "react";

// ── Constants (matching directory ProfileCard.tsx) ──────────────────────────

const AVATAR_SIZE = 120;
const AVATAR_SPACER = 64;
const CARD_TOP_MARGIN = 64;
const CARD_OFFSET_Y = 7;
const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));
const AVATAR_BORDER_MASK_WIDTH = AVATAR_SIZE + 18;

// Theme is now managed via standard Tailwind classes in index.css

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileLink {
  id: number;
  url: string;
  label: string;
  platform: string;
  is_verified: boolean;
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

type Step = "identify" | "editor" | "payment" | "redirecting";

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const uid = window.location.pathname.split("/").pop() || "";
  const [step, setStep] = useState<Step>("identify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [edits, setEdits] = useState({
    display_name: "",
    bio: "",
    links: [] as ProfileLink[],
  });
  const resolveName = useCallback(async (name: string) => {
    setLoading(true);
    setError("");
    const endpoint = uid === "demo" ? "/demo" : `/interaction/${uid}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "resolve", name }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setProfile(data);
      setEdits({
        display_name: data.display_name || "",
        bio: data.bio || "",
        address: data.address || "",
        links: (data.links || []).map((l: ProfileLink) => ({ ...l })),
      });
      setStep("editor");
    } catch {
      setError("Failed to resolve name.");
    }
    setLoading(false);
  }, [uid]);

  const goToPayment = useCallback(() => setStep("payment"), []);

  const verifyOTP = useCallback(async (otp: string) => {
    setLoading(true);
    setError("");
    const endpoint = uid === "demo" ? "/demo" : `/interaction/${uid}`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        body: new URLSearchParams({
          action: "verify",
          otp,
          memo: profile?.memo || "",
          address: profile?.address || "",
          profile_edits: JSON.stringify({
            display_name: edits.display_name.trim() || null,
            bio: edits.bio.trim() || null,
            address: edits.address?.trim() || null,
            links: edits.links
              .filter(l => l.url.trim())
              .map(l => ({
                id: l.id || undefined,
                url: l.url.trim(),
                label: l.label || extractDomain(l.url),
                platform: l.platform || "Other",
                _delete: false,
              })),
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
      if (data.isDemo) {
        setStep("redirecting");
        setTimeout(() => {
          window.location.href = "/demo";
        }, 2500);
        return;
      }
      setStep("redirecting");
    } catch {
      setError("Verification failed.");
    }
    setLoading(false);
  }, [uid, profile, edits]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden font-sans transition-colors duration-500 bg-[#faf6ed] flex flex-col pt-10">
      <div className="relative w-full max-w-[460px] mx-auto p-4 pb-24 flex flex-col">
        {step === "identify" && (
          <IdentifyStep onResolve={resolveName} loading={loading} error={error} isDemo={!uid} />
        )}
        {step === "editor" && profile && (
          <ProfileEditor
            profile={profile}
            edits={edits}
            setEdits={setEdits}
            onVerify={verifyOTP}
            onBack={() => setStep("identify")}
            loading={loading}
            error={error}
          />
        )}
        {step === "redirecting" && <RedirectingStep />}
      </div>
    </div>
  );
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

// ── Step 1: Identify ───────────────────────────────────────────────────────

function IdentifyStep({ onResolve, loading, error, isDemo }: {
  onResolve: (name: string) => void;
  loading: boolean;
  error: string;
  isDemo?: boolean;
}) {
  const [name, setName] = useState("");
  
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
        placeholder="username or address"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full px-4 py-3.5 text-sm text-center font-medium border border-gray-300 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all shadow-inner"
        autoComplete="off"
        autoFocus
        onKeyDown={e => e.key === "Enter" && onResolve(name)}
      />
      <div className="text-red-500 text-xs mt-2 h-4 font-medium">{error}</div>
      <button
        className="w-full bg-blue-700 text-white rounded-xl py-3.5 text-sm font-semibold mt-2 hover:bg-blue-800 transition-all disabled:opacity-50 shadow-md flex justify-center items-center h-12"
        disabled={loading || !name.trim()}
        onClick={() => onResolve(name)}
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

// ── Step 2: Profile Editor (directory-style card) ──────────────────────────

function ProfileEditor({ profile, edits, setEdits, onVerify, onBack, loading, error }: {
  profile: ProfileData;
  edits: { display_name: string; bio: string; address: string; links: ProfileLink[] };
  setEdits: (fn: any) => void;
  onVerify: (otp: string) => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}) {
  const [otp, setOtp] = useState("");
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [hasSentPayment, setHasSentPayment] = useState(false);

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
      await navigator.clipboard.writeText(edits.address || profile.address || "");
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const bioBytes = new TextEncoder().encode(edits.bio).length;

  const addLink = () => {
    setEdits((prev: any) => ({
      ...prev,
      links: [...prev.links, { id: 0, url: "", label: "", platform: "Other", is_verified: false }],
    }));
  };

  const removeLink = (idx: number) => {
    setEdits((prev: any) => ({
      ...prev,
      links: prev.links.filter((_: any, i: number) => i !== idx),
    }));
  };

  const updateLink = (idx: number, field: keyof ProfileLink, value: string) => {
    setEdits((prev: any) => ({
      ...prev,
      links: prev.links.map((l: ProfileLink, i: number) =>
        i === idx ? { ...l, [field]: value, label: field === "url" ? extractDomain(value) : l.label } : l
      ),
    }));
  };

  return (
    <>
      <div style={{ transform: `translateY(${AVATAR_OVERLAP_Y}px)`, marginTop: CARD_TOP_MARGIN + CARD_OFFSET_Y }}>
        <div className="relative overflow-visible mx-auto mb-8 p-6 animate-fadeIn text-center w-full rounded-[26px] border border-gray-300 bg-white text-gray-900 shadow-inner">

          <div
            className="absolute z-10 flex items-center justify-between"
            style={{ top: ACTION_BUTTONS_TOP, left: 16, right: 16 }}
          >
            <button 
              onClick={onBack} 
              className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              ← Back
            </button>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Edit Profile
            </span>
          </div>

          <div
            className="absolute left-1/2 top-0 z-20 transition-all duration-300"
            style={{ transform: `translate(-50%, calc(-50% - ${AVATAR_OVERLAP_Y}px))` }}
          >
            <ProfileAvatar profile={profile} size={AVATAR_SIZE} borderColor="var(--color-maxi-border)" />
          </div>

          <div style={{ paddingTop: `${AVATAR_SPACER}px` }} aria-hidden />

          <div className="mt-3 flex w-full flex-col items-center px-4">
            <div className="max-w-full text-center inline-flex items-center justify-center gap-2 flex-wrap">
              <input
                type="text"
                value={edits.display_name}
                onChange={e => setEdits((prev: any) => ({ ...prev, display_name: e.target.value }))}
                placeholder="Display Name"
                maxLength={32}
                className="w-full text-center bg-transparent border-b border-dashed border-gray-300 outline-none text-gray-900 text-3xl font-black leading-tight max-w-[90%] placeholder-gray-300 focus:border-blue-400 transition-colors"
              />
              {profile.address_verified && <VerifiedBadge verified={true} />}
            </div>
            <div className="text-sm font-medium mt-1 text-gray-400">/{profile.name}</div>
          </div>

          <div className="w-full px-6 mt-1.5 relative">
            <textarea
              value={edits.bio}
              onChange={e => setEdits((prev: any) => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell the world about yourself"
              maxLength={100}
              rows={2}
              className="w-full text-center bg-gray-50/50 hover:bg-gray-50 focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-xl px-3 py-2 text-[13px] text-gray-600 outline-none transition-all resize-none shadow-sm"
            />
            <div className={`text-[10px] text-right mt-0.5 ${bioBytes > 90 ? 'text-orange-500' : 'text-gray-400'}`}>
              {bioBytes}/100
            </div>
          </div>

          <div className="mt-1.5 text-[11px] flex flex-wrap justify-center gap-x-1.5 gap-y-1 text-gray-500 font-medium px-4">
            <span>Joined {profile.created_at ? new Date(profile.created_at).toLocaleString("default", { month: "short", year: "numeric" }) : "Recently"}</span>
          </div>

          <div className="mt-2.5 flex items-center justify-center px-4 w-full">
            <div className="relative flex items-center gap-2 border border-gray-200 bg-gray-50 hover:bg-white transition-colors text-gray-700 font-mono text-[11px] rounded-full pl-3 pr-1 py-1 shadow-xs w-full max-w-[90%]">
              <input
                type="text"
                value={edits.address !== undefined ? edits.address : profile.address}
                onChange={e => setEdits((prev: any) => ({ ...prev, address: e.target.value }))}
                className="flex-1 bg-transparent border-none outline-none text-gray-600 truncate placeholder-gray-400"
                placeholder="Unified Address (u1...)"
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

          <div
            className="relative flex flex-col items-center w-full mx-auto rounded-2xl border border-gray-300 bg-white/80 shadow-inner transition-all overflow-hidden mt-5 pb-0"
            style={{ maxWidth: 404 }}
          >
            <div className="w-full text-sm text-gray-700 transition-all duration-300 overflow-hidden">
              <div className="px-4 pt-2 pb-3 bg-transparent/70 border-t border-gray-200 flex flex-col gap-2">
                {edits.links.map((link, idx) => (
                  <LinkRow
                    key={idx}
                    link={link}
                    editable={!link.is_verified}
                    onRemove={() => removeLink(idx)}
                    onUrlChange={v => updateLink(idx, "url", v)}
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
          
          {/* Payment & Verification Section Inside Card */}
          <div className="w-full mt-6 px-4">
            {!showVerification ? (
              <div className="w-full flex justify-center mb-6">
                <button
                  type="button"
                  onClick={() => setShowVerification(true)}
                  className="w-full bg-green-600 text-white rounded-xl py-3.5 text-sm font-semibold shadow-md hover:bg-green-700 transition-all flex items-center justify-center h-12 max-w-[404px]"
                >
                  Start Verification
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center animate-fadeIn mb-6">
                <div className="w-full h-px bg-gray-200 mb-4 max-w-[404px]" />
                
                <div className="flex flex-col items-center p-4 relative bg-[rgba(252,253,253,0.92)] border border-[rgba(34,36,38,0.12)] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] ring-1 ring-inset ring-[rgba(255,255,255,0.4)] backdrop-blur-md max-w-sm mx-auto w-full">
                  {!hasSentPayment ? (
                    <>
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

                      <div className="text-[11px] text-gray-500 font-medium leading-relaxed mt-4 text-center">
                        <p>Do not leave the page before entering the code.</p>
                      </div>

                      <div className="w-full mt-4">
                        <button
                          type="button"
                          onClick={() => setHasSentPayment(true)}
                          className="w-full text-gray-800 bg-white border border-gray-300 rounded-xl py-3 text-sm font-semibold h-11 transition-all hover:bg-gray-50 flex items-center justify-center shadow-sm"
                        >
                          I Sent It!
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full max-w-[300px] mx-auto py-2">
                      <button
                        type="button"
                        onClick={() => setHasSentPayment(false)}
                        className="absolute left-0 top-0 inline-flex h-8 w-8 -translate-x-3 -translate-y-1 items-center justify-center text-gray-500 transition-all duration-200 hover:text-blue-600 active:text-blue-700"
                        title="Back to payment details"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 18 9 12l6-6" />
                        </svg>
                      </button>

                      <div className="space-y-4 pt-1">
                        <p className="text-center text-[11px] font-medium text-gray-600 px-6">
                          Code will be sent to address on profile.
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
                  )}
                </div>
              </div>
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

// ── Link Row (matches directory ProfileLinkRow) ────────────────────────────

function LinkRow({ link, editable, onRemove, onUrlChange }: {
  link: ProfileLink;
  editable: boolean;
  onRemove: () => void;
  onUrlChange: (url: string) => void;
}) {
  const domain = extractDomain(link.url);
  const favicon = getFavicon(link.platform, link.url);

  return (
    <div className="flex items-center gap-2.5 py-0.5 border-b border-gray-100 last:border-0 min-w-0 flex-shrink-0">
      <div className="flex items-center gap-1.5 shrink-0 min-w-0 pl-0.5">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            className="w-3.5 h-3.5 rounded-xs opacity-80 flex-shrink-0"
            onError={e => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="w-3.5 h-3.5 rounded-xs opacity-80 flex-shrink-0 bg-gray-200" />
        )}
        <span className="font-medium text-[13px] text-gray-800 truncate pl-0.5">{link.label || domain}</span>
        {link.is_verified && <VerifiedBadge verified label="Auth" />}
      </div>

      <div className="flex items-center gap-1.5 ml-auto min-w-0 text-[13px] text-gray-600 justify-end flex-1">
        {editable ? (
          <>
            <input
              type="url"
              value={link.url}
              onChange={e => onUrlChange(e.target.value)}
              placeholder="https://..."
              className="flex-1 min-w-0 text-right bg-transparent border-none outline-none text-gray-600"
            />
            <button type="button" onClick={onRemove} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors ml-1 p-1" title="Remove Link">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <span className="flex-1 min-w-0 truncate text-right">{domain}</span>
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
  if (url) {
    try {
      const d = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
      return `https://www.google.com/s2/favicons?domain=${d}&sz=32`;
    } catch {}
  }
  return "";
}

// ── Profile Avatar (matches directory ProfileAvatar) ───────────────────────

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

// ── Verified Badge (matches directory VerifiedBadge) ───────────────────────

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

// PaymentStep removed completely as it is now integrated into ProfileEditor

// ── Step 4: Redirecting ────────────────────────────────────────────────────

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
