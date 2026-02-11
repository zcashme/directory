import { useState, useEffect, useMemo } from "react";
import type { MouseEvent } from "react";
import LinkInput from "@/ui/signup/LinkInput";
import SocialLinkInput from "@/ui/signup/SocialLinkInput";
import { buildSocialUrl } from "@/lib/profile/usernameNormalizer";
import CitySearchDropdown from "@/ui/signup/CitySearchDropdown";
import {
  getAuthProviderForUrl,
  getLinkAuthToken,
  isLinkAuthPending,
  startOAuthVerification,
} from "@/lib/profile/accountAuthFlow";
import AuthExplainerModal from "@/ui/profile/AuthExplainerModal";
import HelpIcon from "@/ui/common/HelpIcon";
import ProfileField from "@/ui/profile/ProfileField";
import { RedirectModal, AvatarReauthModal, AvatarPreviewModal } from "@/ui/profile/editorModals";
import { parseSocialUrl, isValidImageUrl, applyProviderAvatar } from "@/lib/profile/providerAvatars";
import useVerificationFlow from "@/ui/social/useVerificationFlow";
import { useEditsStore, type ParsedLink, type FormState } from "@/lib/stores/edits";
import type { Profile, EnrichedProfileLink } from "@/lib/profile/types";

const FIELD_CLASS =
  "w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-hidden focus:border-blue-500 text-gray-800 placeholder-gray-400";
const LINK_FIELD_CLASS =
  "rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-hidden focus:border-blue-500 text-gray-800 placeholder-gray-400 appearance-none";
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

// Removed - now using store.setDeletedField directly

interface ProfileEditorProps {
  profile: Profile;
  links?: EnrichedProfileLink[];
}

interface AvatarPrompt {
  provider: string;
  url: string;
}

export default function ProfileEditor({ profile, links }: ProfileEditorProps) {
  const {
    form,
    deletedFields,
    pendingEdits,
    setForm,
    updateField,
    setDeletedField,
    initializeForm,
    addLinkAuthToken,
    removeLinkAuthToken,
  } = useEditsStore();
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

  // Display value for city search input (local UI state)
  const [nearestCityDisplay, setNearestCityDisplay] = useState(profile.nearest_city_name || "");

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
        verification_expires_at: l.verification_expires_at,
        _uid: crypto.randomUUID()
      } as ParsedLink;
    });
  }, [profile, links]);

  // Initialize form from profile and links
  useEffect(() => {
    initializeForm(profile, originalLinks);
  }, [profile.id]); // Only re-initialize if profile ID changes

  // Update links when originalLinks changes (e.g., after verification)
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      links: originalLinks.map((l) => ({ ...l })),
    }));
  }, [originalLinks, setForm]);


  const [imageUrlValid, setImageUrlValid] = useState(true);
  const [imageUrlReason, setImageUrlReason] = useState<string | null>(null);

  useEffect(() => {
    const { valid, reason } = isValidImageUrl(form.profile_image_url);
    setImageUrlValid(valid);
    setImageUrlReason(reason);
  }, [form.profile_image_url]);

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
  useVerificationFlow(profile.id, setShowRedirect);

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

  // Profile field diffs and link tokens are now auto-computed in the store

  // Handlers
  const handleChange = (field: string, value: string) =>
    updateField(field as keyof FormState, value);

  const avatarCallbacks = {
    setAvatarPrompt,
    setDeletedFields: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      const newFields = fn(deletedFields as unknown as Record<string, boolean>);
      Object.entries(newFields).forEach(([key, value]) => {
        setDeletedField(key as keyof typeof deletedFields, value);
      });
    },
    handleChange
  };

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
          _uid: crypto.randomUUID(),
        },
      ],
    }));

  const removeLink = (uid: string) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l._uid !== uid)
    }));
    // Note: Deletion token (-{id}) is automatically computed by the store
  };

  const resetLinks = () => {
    setForm((prev) => ({
      ...prev,
      links:
        originalLinks.length > 0
          ? originalLinks.map((l) => ({ ...l }))
          : [{
              id: null, url: "", is_verified: false,
              _uid: crypto.randomUUID(),
            } as ParsedLink],
    }));
    // Note: Link tokens are automatically recomputed by the store
  };

  const toggleAddress = (e?: MouseEvent<HTMLButtonElement>) => {
    if (!profile.address_verified && e) {
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
    setDeletedField("address", !deletedFields.address);
  };

  return (
    <div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
      <RedirectModal isOpen={showRedirect} label={redirectLabel} />
      <AuthExplainerModal
        isOpen={authInfoOpen && !!authInfoLink}
        canAuthenticate={!!profile.address_verified}
        authPending={!!authInfoPending}
        authRedirectOpen={showRedirect}
        providerLabel={authInfoProvider?.label}
        onClose={() => { setAuthInfoOpen(false); setAuthInfoLink(null); }}
        onAuthenticate={() => {
          if (!authInfoLink) return;
          if (!profile.address_verified) return;
          if (authInfoProvider) { startOAuth(authInfoProvider.key, authInfoLink.url); return; }
          if (!authInfoToken || authInfoPending) return;
          addLinkAuthToken(authInfoToken);
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
      <div className="w-full max-w-xl bg-transparent overflow-visible">

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
          deleteDisabled={!originals.name}
          onDelete={() => setDeletedField("name", !deletedFields.name)}
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
          deleteDisabled={!originals.display_name}
          onDelete={() => setDeletedField("display_name", !deletedFields.display_name)}
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
          deleteDisabled={!originals.bio}
          onDelete={() => setDeletedField("bio", !deletedFields.bio)}
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
          isDeleted={deletedFields.nearest_city}
          deleteDisabled={!profile.nearest_city_id}
          onDelete={() => {
            setDeletedField('nearest_city', !deletedFields.nearest_city);
            setNearestCityDisplay("");
          }}
        >
          <CitySearchDropdown
            value={nearestCityDisplay}
            placeholder={
              !deletedFields.nearest_city && form.nearest_city_id && nearestCityDisplay === ""
                ? form.nearest_city_name
                : "Search nearest city…"
            }
            onChange={(val) => {
              if (typeof val === "string") {
                setNearestCityDisplay(val);
                updateField('nearest_city_id', null);
              } else {
                setNearestCityDisplay(val.fullLabel || "");
                updateField('nearest_city_id', val.id);
                updateField('nearest_city_name', val.fullLabel || "");
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
          deleteDisabled={!originals.profile_image_url}
          onDelete={() => setDeletedField("profile_image_url", !deletedFields.profile_image_url)}
        >
          <input
            id="pimg"
            type="url"
            value={form.profile_image_url}
            placeholder={originals.profile_image_url}
            onChange={(e) => handleChange("profile_image_url", e.target.value)}
            className={`${FIELD_CLASS} font-mono ${imageUrlValid
              ? "border-[#0a1126]/60 focus:border-blue-500"
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
                        onClick={() => applyProviderAvatar("Discord", row.url, avatarCallbacks)}
                        className="text-xs px-2 py-1 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
                      >
                        Use Discord Avatar
                      </button>
                    )}
                    {showXAvatarAction && (
                      <button
                        type="button"
                        onClick={() => applyProviderAvatar("X", row.url, avatarCallbacks)}
                        className="text-xs px-2 py-1 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
                      >
                        Use X Avatar
                      </button>
                    )}
                    {showGithubAvatarAction && (
                      <button
                        type="button"
                        onClick={() => applyProviderAvatar("GitHub", row.url, avatarCallbacks)}
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
                      if (authProvider) { startOAuth(authProvider.key, row.url); return; }
                      if (isPending) {
                        removeLinkAuthToken(token);
                      } else {
                        addLinkAuthToken(token);
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
          className="text-sm font-semibold text-blue-600 hover:underline mt-1"
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
