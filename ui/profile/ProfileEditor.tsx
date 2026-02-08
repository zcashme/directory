import { useState, useEffect, useMemo } from "react";
import LinkInput from "@/ui/signup/LinkInput";
import SocialLinkInput from "@/ui/signup/SocialLinkInput";
import { isValidUrl } from "@/lib/profile/validateUrl";
import { normalizeSocialUsername, buildSocialUrl } from "@/lib/profile/usernameNormalizer";
import CitySearchDropdown from "@/ui/signup/CitySearchDropdown";
import {
  getAuthProviderForUrl,
  getLinkAuthToken,
  isLinkAuthPending,
  appendLinkToken,
  removeLinkToken,
  startOAuthVerification,
} from "@/lib/profile/accountAuthFlow";
import AuthExplainerModal from "@/ui/profile/AuthExplainerModal";
import HelpIcon from "@/ui/common/HelpIcon";
import ProfileField, { DeleteActionButton } from "@/ui/profile/ProfileField";
import { RedirectModal, AvatarReauthModal, AvatarPreviewModal } from "@/ui/profile/editorModals";
import { parseSocialUrl, isValidImageUrl, applyProviderAvatar } from "@/lib/profile/providerAvatars";
import useVerificationFlow from "@/ui/social/useVerificationFlow";
import type { Profile, EnrichedProfileLink } from "@/types";

const FIELD_CLASS =
  "w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-hidden focus:border-green-500 text-gray-800 placeholder-gray-400";
const LINK_FIELD_CLASS =
  "rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-hidden focus:border-green-500 text-gray-800 placeholder-gray-400 appearance-none";
const LINK_CONTAINER_CLASS =
  "rounded-2xl border border-[#0a1126]/60 p-3 bg-transparent";
const VERIFY_HINT_CLASS = "text-xs text-gray-500 italic";

interface CharCounterProps {
  text: string;
}

function CharCounter({ text }: CharCounterProps) {
  const remaining = 100 - text.length;
  const over = remaining < 0;
  return (
    <span
      className={`absolute bottom-2 right-2 text-xs ${over ? "text-red-600" : "text-gray-400"}`}
    >
      {over ? `-${-remaining} chars` : `+${remaining} chars`}
    </span>
  );
}

function createDeleteToggle(
  field: string,
  originals: Record<string, string>,
  setDeletedFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  setForm: React.Dispatch<React.SetStateAction<any>>,
  handleChange: (field: string, value: string) => void
) {
  return () =>
    setDeletedFields((prev) => {
      const next = !prev[field];
      if (next) {
        setForm((f: any) => ({ ...f, [field]: "" }));
      } else {
        setForm((f: any) => ({ ...f, [field]: originals[field] }));
      }
      return { ...prev, [field]: next };
    });
}

interface FeedbackProps {
  setPendingEdits?: (field: string, value: unknown) => void;
  pendingEdits?: Record<string, any>;
}

interface ProfileEditorProps {
  profile: Profile;
  links?: EnrichedProfileLink[];
  feedbackProps?: FeedbackProps;
}

interface ParsedLink extends Partial<EnrichedProfileLink> {
  id: number | null;
  url: string;
  username?: string;
  previewUrl?: string;
  valid: boolean;
  reason: string | null;
  is_verified: boolean;
  verification_expires_at: string | null;
  _uid: string;
  platform?: "X" | "GitHub" | "Instagram" | "Discord" | null;
  otherUrl?: string;
}

interface FormState {
  address: string;
  name: string;
  display_name: string;
  bio: string;
  profile_image_url: string;
  links: ParsedLink[];
}

interface AvatarPrompt {
  provider: string;
  url: string;
}

export default function ProfileEditor({ profile, links, feedbackProps = {} }: ProfileEditorProps) {
  const { setPendingEdits, pendingEdits } = feedbackProps;
  const pendingProfileEdits = pendingEdits?.profile || {};
  const pendingDeleted = Array.isArray(pendingProfileEdits?.d)
    ? pendingProfileEdits.d
    : [];
  const hasPendingField = (key: string, token: string) =>
    Boolean(pendingProfileEdits?.[key]) || pendingDeleted.includes(token);
  const hasPendingLinks =
    Array.isArray(pendingEdits?.l) && pendingEdits.l.length > 0;
  const [showRedirect, setShowRedirect] = useState(false);
  const [redirectLabel, setRedirectLabel] = useState("X.com");
  const [avatarPrompt, setAvatarPrompt] = useState<AvatarPrompt | null>(null);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [authInfoOpen, setAuthInfoOpen] = useState(false);
  const [authInfoLink, setAuthInfoLink] = useState<ParsedLink | null>(null);
  const providerKeyByLabel: Record<string, string> = {
    Discord: "discord",
    X: "twitter",
    GitHub: "github",
  };

  // stored values (read-only originals)
  const origCityId = profile.nearest_city_id || null;
  const origCityName = profile.nearest_city_name || "";
  const [nearestCityDisplay, setNearestCityDisplay] = useState(origCityName);
  const [nearestCityId, setNearestCityId] = useState<number | null>(origCityId);

  // Normalize incoming DB links
  const originalLinks = useMemo(() => {
    const arr = Array.isArray(links) ? links : Array.isArray(profile.links) ? profile.links : [];
    return arr.map((l) => {
      const parsed = parseSocialUrl(l.url ?? "");
      const isDiscordProfileUrl = /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/users\/[^/?#]+/i.test(l.url || "");
      const prefersLabel = parsed.platform === "Discord" && isDiscordProfileUrl && l.label;
      return {
        id: l.id ?? null,
        url: l.url ?? "",
        ...parsed,
        username: prefersLabel ? l.label : parsed.username,
        previewUrl: prefersLabel ? (l.url ?? "") : "",
        valid: true,
        reason: null,
        is_verified: !!l.is_verified,
        verification_expires_at: l.verification_expires_at || null,
        _uid: crypto.randomUUID()
      } as ParsedLink;
    });
  }, [profile, links]);

  // Form state
  const [form, setForm] = useState<FormState>({
    address: "",
    name: "",
    display_name: "",
    bio: "",
    profile_image_url: "",
    links: originalLinks.map((l) => ({ ...l })),
  });

  const [deletedCity, setDeletedCity] = useState(false);
  const [deletedFields, setDeletedFields] = useState({
    address: false,
    name: false,
    display_name: false,
    bio: false,
    profile_image_url: false,
  });

  const [imageUrlValid, setImageUrlValid] = useState(true);
  const [imageUrlReason, setImageUrlReason] = useState<string | null>(null);

  useEffect(() => {
    const { valid, reason } = isValidImageUrl(form.profile_image_url);
    setImageUrlValid(valid);
    setImageUrlReason(reason);
  }, [form.profile_image_url]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      links: originalLinks.map((l) => ({ ...l })),
    }));
  }, [originalLinks]);

  const originals = useMemo(
    () => ({
      address: profile.address || "",
      name: profile.name || "",
      display_name: profile.display_name || "",
      bio: profile.bio || "",
      profile_image_url: profile.profile_image_url || "",
    }),
    [profile]
  );

  // Verification flow hook
  useVerificationFlow(profile.id, setForm, setShowRedirect);

  const startOAuth = (providerKey: string, url: string) =>
    startOAuthVerification({
      providerKey,
      profile,
      url,
      setShowRedirect,
      setRedirectLabel,
    });

  const authInfoProvider = authInfoLink ? getAuthProviderForUrl(authInfoLink.url) : null;
  const authInfoToken = authInfoLink ? getLinkAuthToken(authInfoLink) : null;
  const authInfoPending =
    authInfoToken && isLinkAuthPending(pendingEdits, authInfoToken);

  // Profile field diffs including deletions
  useEffect(() => {
    if (!setPendingEdits) return;

    const changed: Record<string, any> = {};
    let cityToken: string | undefined = undefined;

    if (nearestCityId && nearestCityId !== profile.nearest_city_id) {
      cityToken = String(nearestCityId);
    }
    if (deletedCity && profile.nearest_city_id) {
      cityToken = "-";
    }
    if (cityToken !== undefined) {
      changed.c = cityToken;
    }

    if (!deletedFields.address && form.address && form.address.trim() !== "" && form.address !== originals.address)
      changed.address = form.address;
    if (!deletedFields.name && form.name && form.name.trim() !== "" && form.name !== originals.name)
      changed.name = form.name;
    if (!deletedFields.display_name && form.display_name && form.display_name.trim() !== "" && form.display_name !== originals.display_name)
      changed.display_name = form.display_name;
    if (!deletedFields.bio && form.bio && form.bio.trim() !== "" && form.bio !== originals.bio)
      changed.bio = form.bio;
    if (
      !deletedFields.profile_image_url &&
      imageUrlValid &&
      form.profile_image_url &&
      form.profile_image_url.trim() !== "" &&
      form.profile_image_url !== originals.profile_image_url
    ) {
      changed.profile_image_url = form.profile_image_url;
    }

    const deleted: string[] = [];
    if (deletedFields.address) deleted.push("a");
    if (deletedFields.name) deleted.push("n");
    if (deletedFields.display_name) deleted.push("h");
    if (deletedFields.bio) deleted.push("b");
    if (deletedFields.profile_image_url) deleted.push("i");

    if (deleted.length > 0) {
      changed.d = deleted;
    } else {
      delete changed.d;
    }

    const changedStr = JSON.stringify(changed);
    if ((ProfileEditor as any)._lastPending !== changedStr) {
      (ProfileEditor as any)._lastPending = changedStr;
      setPendingEdits("profile", changed);
    }
  }, [
    form.address, form.name, form.display_name, form.bio, form.profile_image_url,
    nearestCityId, profile.nearest_city_id, deletedCity, imageUrlValid,
    originals.address, originals.name, originals.display_name, originals.bio, originals.profile_image_url,
    deletedFields.address, deletedFields.name, deletedFields.display_name, deletedFields.bio, deletedFields.profile_image_url,
    setPendingEdits
  ]);

  // Compute link tokens
  useEffect(() => {
    if (!setPendingEdits) return;

    const effectTokens: string[] = [];
    const originalById = new Map<string, ParsedLink>();
    const originalUrlSet = new Set<string>();

    for (const l of originalLinks) {
      if (!l) continue;
      const url = (l.url || "").trim();
      if (l.id) originalById.set(String(l.id), { ...l, url });
      if (url) originalUrlSet.add(url);
    }

    const currentUrls = new Set(
      form.links.map((l) => (l.url || "").trim()).filter(Boolean)
    );
    const currentById = new Map(
      form.links
        .filter((l) => l.id)
        .map((l) => [String(l.id), (l.url || "").trim()])
    );

    let normalizedVerify = Array.isArray(pendingEdits?.l)
      ? [...pendingEdits.l]
      : [];

    for (const token of pendingEdits?.l || []) {
      if (!token.startsWith("+!")) continue;
      const oldUrl = token.slice(2);
      const stillExists = form.links.some(
        (l) => (l.url || "").trim() === oldUrl.trim()
      );

      if (!stillExists) {
        normalizedVerify = normalizedVerify.filter((t) => t !== token);
        const newUrl = form.links
          .map((l) => (l.url || "").trim())
          .find((u) => u && !originalUrlSet.has(u));
        if (newUrl) normalizedVerify.push(`+!${newUrl}`);
      }
    }

    for (const row of form.links) {
      const id = row.id ?? null;
      const newUrlRaw = (row.url || "").trim();
      const { valid: urlValid } = isValidUrl(newUrlRaw);
      const newUrl = urlValid ? newUrlRaw : "";

      if (id) {
        const original = originalById.get(String(id));
        const originalUrl = original ? original.url : "";
        if (newUrl === originalUrl) continue;
        if (!newUrl) { effectTokens.push(`-${id}`); continue; }
        effectTokens.push(`+${id}:${newUrl}`);
      } else {
        if (!newUrl) continue;
        const isNew = !originalUrlSet.has(newUrl);
        const verifyToken = `+!${newUrl}`;
        const isExplicitVerify = normalizedVerify.includes(verifyToken);
        if (isNew && !isExplicitVerify) {
          effectTokens.push(`+${newUrl}`);
        }
      }
    }

    const preservedOld = Array.isArray(normalizedVerify)
      ? normalizedVerify.filter((t) => {
        if (/^![0-9]+$/.test(t) || /^\+!/.test(t)) return true;
        if (/^-[0-9]+$/.test(t)) return true;
        if (/^\+[0-9]+:/.test(t)) {
          const id = t.slice(1, t.indexOf(":"));
          const original = originalById.get(id);
          const currentUrl = currentById.get(id) || "";
          const { valid: currentValid } = isValidUrl(currentUrl);
          if (!currentUrl || !currentValid) return false;
          if (original && currentUrl === original.url) return false;
          const hasNewer = effectTokens.some((et) => et.startsWith(`+${id}:`));
          return !hasNewer;
        }
        if (/^\+[^!]/.test(t) && !t.includes(":")) {
          const url = t.slice(1).trim();
          const hasExplicitVerify = normalizedVerify.includes(`+!${url}`);
          return currentUrls.has(url) && !hasExplicitVerify;
        }
        return false;
      })
      : [];

    const uniqTokens = (arr: string[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const t of arr) {
        if (!seen.has(t)) { seen.add(t); out.push(t); }
      }
      return out;
    };

    const merged = uniqTokens([...effectTokens, ...preservedOld]);

    const filtered = merged.filter((t) => {
      if (t.startsWith("!")) {
        const id = t.slice(1);
        return !merged.includes(`-${id}`);
      }
      if (t.startsWith("+!")) {
        const url = (t.slice(2) || "").trim();
        if (!url) return false;
        return currentUrls.has(url);
      }
      return true;
    });

    const serialized = JSON.stringify(filtered);
    if ((ProfileEditor as any)._lastLinks !== serialized) {
      (ProfileEditor as any)._lastLinks = serialized;
      setPendingEdits("l", filtered);
    }
  }, [form.links, originalLinks, pendingEdits?.l, setPendingEdits]);

  // Handlers
  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const avatarCallbacks = { setAvatarPrompt, setDeletedFields, handleChange };

  const handleLinkChange = (uid: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l._uid === uid ? { ...l, url: value } : l)),
    }));
  };

  const handleSocialLinkChange = (uid: string, value: any) => {
    const nextUrl =
      value.platform === "Other"
        ? (value.otherUrl || "").trim()
        : buildSocialUrl(value.platform, (value.username || "").trim()) || "";
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l) =>
        l._uid === uid ? { ...l, ...value, url: nextUrl } : l
      ),
    }));
  };

  const addLink = () =>
    setForm((prev) => ({
      ...prev,
      links: [
        ...prev.links,
        {
          id: null, url: "", platform: "X" as const, username: "", otherUrl: "",
          valid: true, reason: null, is_verified: false,
          verification_expires_at: null, _uid: crypto.randomUUID(),
        },
      ],
    }));

  const removeLink = (uid: string) =>
    setForm((prev) => {
      const removed = prev.links.find((l) => l._uid === uid);
      const newLinks = prev.links.filter((l) => l._uid !== uid);
      if (removed?.id && setPendingEdits) appendLinkToken(pendingEdits, setPendingEdits, `-${removed.id}`);
      return { ...prev, links: newLinks };
    });

  const resetLinks = () => {
    setForm((prev) => ({
      ...prev,
      links:
        originalLinks.length > 0
          ? originalLinks.map((l) => ({ ...l }))
          : [{
              id: null, url: "", is_verified: false,
              verification_expires_at: null, _uid: crypto.randomUUID(),
            } as ParsedLink],
    }));
    if (!setPendingEdits) return;
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const filtered = prev.filter((t) => !/^[-+!]/.test(t) && !/^\+!/.test(t));
    setPendingEdits("l", filtered);
  };

  const toggleAddress = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!profile.address_verified) {
      const btn = e.currentTarget;
      const popup = e.currentTarget.nextElementSibling as HTMLElement;
      btn.classList.remove("shake");
      void btn.offsetWidth;
      btn.classList.add("shake");
      popup.classList.add("show");
      clearTimeout((popup as any)._timer);
      (popup as any)._timer = setTimeout(() => { popup.classList.remove("show"); }, 3000);
      return;
    }
    createDeleteToggle("address", originals, setDeletedFields, setForm, handleChange)();
  };

  return (
    <div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
      <RedirectModal isOpen={showRedirect} label={redirectLabel} />
      <AuthExplainerModal
        isOpen={authInfoOpen && !!authInfoLink}
        canAuthenticate={!!profile.address_verified}
        authPending={authInfoPending}
        authRedirectOpen={showRedirect}
        providerLabel={authInfoProvider?.label}
        onClose={() => { setAuthInfoOpen(false); setAuthInfoLink(null); }}
        onAuthenticate={() => {
          if (!authInfoLink) return;
          if (!profile.address_verified) return;
          if (authInfoProvider) { startOAuth(authInfoProvider.key, authInfoLink.url); return; }
          if (!authInfoToken || authInfoPending) return;
          if (!setPendingEdits) return;
          appendLinkToken(pendingEdits, setPendingEdits, authInfoToken);
          setAuthInfoOpen(false);
        }}
      />
      <AvatarPreviewModal
        isOpen={avatarPreviewOpen}
        src={(form.profile_image_url || originals.profile_image_url || "").trim()}
        onClose={() => setAvatarPreviewOpen(false)}
      />
      <AvatarReauthModal
        isOpen={!!avatarPrompt}
        providerLabel={avatarPrompt?.provider || ""}
        onLater={() => setAvatarPrompt(null)}
        onReauth={() => {
          if (!avatarPrompt?.url) return;
          const provider = avatarPrompt.provider;
          const url = avatarPrompt.url;
          setAvatarPrompt(null);
          const providerKey = providerKeyByLabel[provider];
          if (providerKey) startOAuth(providerKey, url);
        }}
      />
      <div className="w-full max-w-xl bg-transparent overflow-hidden">

        {/* Header */}
        <div className="px-1 pb-3 mb-4 border-b border-black/10">
          <h2 className="text-base font-semibold text-gray-800 text-center">
            Edit {profile.name}
          </h2>
        </div>

        {/* ZCASH ADDRESS */}
        <ProfileField
          label="Zcash Address"
          htmlFor="addr"
          helpText="Your Zcash address where verification codes are sent."
          hasPending={hasPendingField("address", "a")}
          pendingHint="Verify to apply edits"
          isDeleted={deletedFields.address}
          deleteDisabled={!profile.address_verified}
          onDelete={toggleAddress}
          deletePopup={
            <div className="absolute fade-popup z-50 w-90 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs right-0 bottom-full mb-1">
              Cannot change unverified address. <br /> Lost access? Create new profile.
            </div>
          }
        >
          <input
            id="addr"
            type="text"
            value={form.address}
            placeholder={originals.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className={`${FIELD_CLASS} font-mono`}
          />
        </ProfileField>

        {/* USERNAME */}
        <ProfileField
          label="Username"
          htmlFor="name"
          helpText="Your unique handle on Zcash.me."
          hasPending={hasPendingField("name", "n")}
          isDeleted={deletedFields.name}
          onDelete={createDeleteToggle("name", originals, setDeletedFields, setForm, handleChange)}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
              Zcash.me/
            </span>
            <input
              id="name"
              type="text"
              value={form.name}
              placeholder={originals.name}
              onChange={(e) => {
                const val = e.target.value
                  .normalize("NFKC")
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, "_")
                  .replace(/[^a-z0-9_-]/g, "");
                handleChange("name", val);
              }}
              className={`${FIELD_CLASS} pl-[5.5rem]`}
            />
          </div>
        </ProfileField>

        {/* DISPLAY NAME */}
        <ProfileField
          label="Display Name"
          htmlFor="display_name"
          helpText="Your public display name."
          hasPending={hasPendingField("display_name", "h")}
          isDeleted={deletedFields.display_name}
          onDelete={createDeleteToggle("display_name", originals, setDeletedFields, setForm, handleChange)}
        >
          <input
            id="display_name"
            type="text"
            value={form.display_name}
            placeholder={originals.display_name || "Enter display name"}
            onChange={(e) => handleChange("display_name", e.target.value)}
            className={FIELD_CLASS}
          />
        </ProfileField>

        {/* BIOGRAPHY */}
        <ProfileField
          label="Biography"
          htmlFor="bio"
          helpText="Your current story arc in 100 characters or less."
          hasPending={hasPendingField("bio", "b")}
          isDeleted={deletedFields.bio}
          onDelete={createDeleteToggle("bio", originals, setDeletedFields, setForm, handleChange)}
        >
          <div className="relative">
            <textarea
              id="bio"
              rows={3}
              maxLength={100}
              value={form.bio}
              placeholder={originals.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              className={`${FIELD_CLASS} resize-none overflow-hidden pr-8 pb-6 relative text-left whitespace-pre-wrap break-words`}
            />
            <CharCounter text={form.bio} />
          </div>
        </ProfileField>

        {/* NEAREST CITY */}
        <ProfileField
          label="Nearest City"
          helpText="Select the city closest to you. This helps with regional discovery and relevance."
          hasPending={!!pendingProfileEdits?.c}
          isDeleted={deletedCity}
          onDelete={() => {
            const next = !deletedCity;
            setDeletedCity(next);
            if (next) {
              setNearestCityId(null);
              setNearestCityDisplay("");
            } else {
              setNearestCityId(origCityId);
              setNearestCityDisplay("");
            }
          }}
        >
          <CitySearchDropdown
            value={nearestCityDisplay}
            placeholder={
              !deletedCity && origCityId && nearestCityDisplay === ""
                ? origCityName
                : "Search nearest city…"
            }
            onChange={(val) => {
              if (typeof val === "string") {
                setNearestCityDisplay(val);
                setNearestCityId(null);
              } else {
                setNearestCityDisplay(val.fullLabel);
                setNearestCityId(val.id);
              }
            }}
          />
        </ProfileField>

        {/* PROFILE IMAGE URL */}
        <ProfileField
          label="Profile Image URL"
          htmlFor="pimg"
          helpText="Link to PNG or JPG. Search 'free image link host'."
          hasPending={hasPendingField("profile_image_url", "i")}
          isDeleted={deletedFields.profile_image_url}
          onDelete={createDeleteToggle("profile_image_url", originals, setDeletedFields, setForm, handleChange)}
        >
          <input
            id="pimg"
            type="url"
            value={form.profile_image_url}
            placeholder={originals.profile_image_url}
            onChange={(e) => handleChange("profile_image_url", e.target.value)}
            className={`${FIELD_CLASS} font-mono ${imageUrlValid
              ? "border-[#0a1126]/60 focus:border-green-500"
              : "border-red-400 focus:border-red-500"
              }`}
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setAvatarPreviewOpen(true)}
              className="text-xs px-2 py-1 border border-green-400 text-green-600 rounded hover:bg-green-50"
            >
              Preview Avatar
            </button>
          </div>
          {!imageUrlValid && imageUrlReason && (
            <p className="text-xs text-red-600 mt-1">{imageUrlReason}</p>
          )}
        </ProfileField>

        {/* Links */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <label className="block font-semibold text-gray-700">Links</label>
              {hasPendingLinks && (
                <span className={VERIFY_HINT_CLASS}>
                  Verify to apply changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetLinks}
                className={`text-xs font-semibold underline ${JSON.stringify(form.links.map(l => ({ id: l.id, url: l.url }))) !==
                  JSON.stringify(originalLinks.map(l => ({ id: l.id, url: l.url })))
                  ? "text-green-700"
                  : "text-gray-500"
                  }`}
              >
                Reset
              </button>
              <HelpIcon text="Authenticated links cannot be changed. Links can only be authenticated after verifying your address via OTP" />
            </div>
          </div>
        </div>

        {form.links.map((row) => {
          const original = originalLinks.find((o) => o.id === row.id) || {} as ParsedLink;
          const isVerified = !!row.is_verified;
          const canVerify = !!profile.address_verified;
          const isExistingLink = !!row.id;
          const originalUrl = (original?.url || "").trim();
          const currentUrl = (row.url || "").trim();
          const hasLinkInput = currentUrl.length > 0;
          const isUnchangedLink = !isExistingLink || currentUrl === originalUrl;
          const canAuthenticate =
            canVerify && isExistingLink && !isVerified && isUnchangedLink;
          const authProvider = getAuthProviderForUrl(row.url);
          const isOAuthLink = !!authProvider;
          const isX = authProvider?.key === "twitter";
          const isGithub = authProvider?.key === "github";
          const isDiscord = authProvider?.key === "discord";

          const token = getLinkAuthToken(row);
          const isPending = token && isLinkAuthPending(pendingEdits, token);
          const showDiscordAvatarAction = isVerified && isDiscord;
          const showXAvatarAction = isVerified && isX;
          const showGithubAvatarAction = isVerified && isGithub;

          const linkActions = (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!canVerify ? (
                  <button
                    type="button"
                    onClick={() => { setAuthInfoLink(row); setAuthInfoOpen(true); }}
                    className="text-xs px-2 py-1 border rounded text-blue-600 border-blue-400 hover:bg-blue-50"
                  >
                    Authenticate
                  </button>
                ) : isVerified ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled
                      className="text-xs px-2 py-1 text-green-700 border border-green-400 rounded opacity-60 cursor-not-allowed"
                    >
                      Authenticated
                    </button>
                    {showDiscordAvatarAction && (
                      <button
                        type="button"
                        onClick={() => applyProviderAvatar("Discord", row.url, profile.id, avatarCallbacks)}
                        className="text-xs px-2 py-1 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
                      >
                        Use Discord Avatar
                      </button>
                    )}
                    {showXAvatarAction && (
                      <button
                        type="button"
                        onClick={() => applyProviderAvatar("X", row.url, profile.id, avatarCallbacks)}
                        className="text-xs px-2 py-1 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
                      >
                        Use X Avatar
                      </button>
                    )}
                    {showGithubAvatarAction && (
                      <button
                        type="button"
                        onClick={() => applyProviderAvatar("GitHub", row.url, profile.id, avatarCallbacks)}
                        className="text-xs px-2 py-1 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
                      >
                        Use Github Avatar
                      </button>
                    )}
                  </div>
                ) : !canAuthenticate ? (
                  hasLinkInput ? (
                    <span className="text-xs text-gray-500 italic">
                      Apply edits to enable authentication
                    </span>
                  ) : null
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) return;
                      if (!setPendingEdits) return;
                      if (authProvider) { startOAuth(authProvider.key, row.url); return; }
                      if (isPending) {
                        removeLinkToken(pendingEdits, setPendingEdits, token);
                      } else {
                        appendLinkToken(pendingEdits, setPendingEdits, token);
                      }
                    }}
                    className={`text-xs px-2 py-1 border rounded ${isPending || (showRedirect && isOAuthLink)
                      ? "text-yellow-700 border-yellow-400 bg-yellow-50"
                      : "text-green-600 border-green-400 hover:bg-green-50"
                      }`}
                  >
                    {isPending || (showRedirect && isOAuthLink) ? "Pending" : "Authenticate"}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeLink(row._uid)}
                className="text-xs text-red-600 hover:underline"
              >
                ⌫ Delete
              </button>
            </div>
          );

          return (
            <div key={row._uid} className="mb-2">
              {isVerified ? (
                <div className={LINK_CONTAINER_CLASS}>
                  <LinkInput
                    value={row.url}
                    onChange={(v) => handleLinkChange(row._uid, v)}
                    readOnly={true}
                    placeholder={original?.url || "example.com"}
                    showValidation={false}
                    inputClassName="border-0 px-0 py-0 bg-transparent"
                  />
                  <div className="mt-2">{linkActions}</div>
                </div>
              ) : (
                <SocialLinkInput
                  value={row}
                  onChange={(v) => handleSocialLinkChange(row._uid, v)}
                  footer={linkActions}
                  containerClassName={LINK_CONTAINER_CLASS}
                  selectClassName={LINK_FIELD_CLASS}
                  inputClassName={LINK_FIELD_CLASS}
                />
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addLink}
          className="text-sm font-semibold text-green-700 hover:underline mt-1"
        >
          ＋ Add Link
        </button>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-black/10">
          <p className="text-sm text-gray-400 text-center">
            <span className="inline-flex items-center gap-1">
              <span className="font-semibold">Verify address to apply edits</span>
            </span>
          </p>
        </div>

      </div>
      <p className="text-sm text-gray-400 text-center mt-4">
      </p>
    </div>
  );
}
