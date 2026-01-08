import { useState, useEffect, useMemo } from "react";
import { useFeedback } from "../hooks/useFeedback";
import LinkInput from "../components/LinkInput";
import SocialLinkInput from "../components/SocialLinkInput";
import CheckIcon from "../assets/CheckIcon.jsx";
import { isValidUrl } from "../utils/validateUrl";
import { normalizeSocialUsername } from "../utils/normalizeSocialLink";
import { buildSocialUrl } from "../utils/buildSocialUrl";
import CitySearchDropdown from "../components/CitySearchDropdown.jsx";
import { supabase } from "../supabase";
import {
  getAuthProviderForUrl,
  getLinkAuthToken,
  isLinkAuthPending,
  appendLinkToken,
  removeLinkToken,
  startOAuthVerification,
} from "../utils/linkAuthFlow";

const FIELD_CLASS =
  "w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400";
const LINK_FIELD_CLASS =
  "rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400 appearance-none";
const LINK_CONTAINER_CLASS =
  "rounded-2xl border border-[#0a1126]/60 p-3 bg-transparent";
const VERIFY_HINT_CLASS = "text-xs text-gray-500 italic";

const isValidImageUrl = (url) => {
  if (!url) return { valid: true, reason: null };

  const trimmed = url.trim();
  const { valid } = isValidUrl(trimmed);
  if (!valid) {
    return { valid: false, reason: "Invalid URL format" };
  }

  const hasImageExt = /\.(png|jpg)(\?.*)?$/i.test(trimmed);
  let isGithubAvatar = false;
  if (!hasImageExt) {
    try {
      const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      const url = new URL(normalized);
      isGithubAvatar = url.hostname.toLowerCase() === "avatars.githubusercontent.com";
    } catch {
      isGithubAvatar = false;
    }
  }

  if (!hasImageExt && !isGithubAvatar) {
    return { valid: false, reason: "Image URL must end in .png or .jpg" };
  }

  return { valid: true, reason: null };
};

const SOCIAL_HOSTS = {
  X: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
  GitHub: ["github.com", "www.github.com"],
  Instagram: ["instagram.com", "www.instagram.com"],
  Reddit: ["reddit.com", "www.reddit.com"],
  LinkedIn: ["linkedin.com", "www.linkedin.com"],
  Discord: [
    "discord.gg",
    "www.discord.gg",
    "discord.com",
    "www.discord.com",
    "discordapp.com",
    "www.discordapp.com"
  ],
  TikTok: ["tiktok.com", "www.tiktok.com"],
  Mastodon: ["mastodon.social"],
  Bluesky: ["bsky.app"],
  Snapchat: ["snapchat.com", "www.snapchat.com"],
};

function detectPlatformFromUrl(rawUrl) {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return null;

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    for (const [platform, hosts] of Object.entries(SOCIAL_HOSTS)) {
      if (hosts.includes(host)) return platform;
    }
  } catch {
    return null;
  }

  return null;
}

function parseSocialUrl(rawUrl) {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return { platform: "X", username: "", otherUrl: "" };
  }

  const platform = detectPlatformFromUrl(trimmed);
  if (!platform) {
    return { platform: "Other", username: "", otherUrl: trimmed };
  }

  return {
    platform,
    username: normalizeSocialUsername(trimmed, platform),
    otherUrl: "",
  };
}

// Simple character counter
function CharCounter({ text }) {
  const remaining = 100 - text.length;
  const over = remaining < 0;
  return (
    <span
      className={`absolute bottom-2 right-2 text-xs ${over ? "text-red-600" : "text-gray-400"
        }`}
    >
      {over ? `-${-remaining} chars` : `+${remaining} chars`}
    </span>
  );
}

function HelpIcon({ text }) {
  const [show, setShow] = useState(false);
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

  return (
    <div
      className="relative inline-block ml-1"
      onMouseEnter={(e) => {
        e.stopPropagation();
        !isTouch && setShow(true);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        !isTouch && setShow(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        isTouch && setShow((s) => !s);
      }}
    >

      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold border border-gray-400 rounded-full text-gray-600 cursor-pointer hover:bg-gray-100 select-none">
        ?
      </span>
      {show && (
        <div className="absolute z-20 w-48 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg shadow-md p-2 -right-1 top-5">
          {text}
        </div>
      )}
    </div>
  );
}

function DeleteActionButton({ onClick, disabled = false, isDeleted = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-normal hover:underline ${disabled
        ? "text-gray-400 cursor-not-allowed"
        : isDeleted
          ? "text-green-700"
          : "text-red-600"
        }`}
    >
      {isDeleted ? "⌦ Reset" : "⌫ Delete"}
    </button>
  );
}

function RedirectModal({ isOpen, label }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
        <div className="mb-4 text-blue-500">
          <svg className="w-12 h-12 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Redirecting to {label}</h3>
        <p className="text-sm text-gray-600">
          Please authorize the app to verify your profile.
        </p>
      </div>
    </div>
  );
}

function AvatarReauthModal({ isOpen, providerLabel, onReauth, onLater }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Avatar not available</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please reauthenticate {providerLabel} to fetch your avatar, or do this later.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onLater}
            className="text-xs px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onReauth}
            className="text-xs px-3 py-2 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
          >
            Reauthenticate
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarPreviewModal({ isOpen, src, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-4 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800">Avatar Preview</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
        {src ? (
          <img
            src={src}
            alt="Avatar preview"
            className="w-full max-h-[60vh] object-contain rounded"
          />
        ) : (
          <p className="text-sm text-gray-600">No image URL provided.</p>
        )}
      </div>
    </div>
  );
}


export default function ProfileEditor({ profile, links }) {
  // 🔥 RENDER DEBUG: Check if component actually renders
  console.log("[PROFILE EDITOR RENDER] ID:", profile.id, "Links count:", links?.length);

  const { setPendingEdits, pendingEdits } = useFeedback();
  const pendingProfileEdits = pendingEdits?.profile || {};
  const pendingDeleted = Array.isArray(pendingProfileEdits?.d)
    ? pendingProfileEdits.d
    : [];
  const hasPendingField = (key, token) =>
    Boolean(pendingProfileEdits?.[key]) || pendingDeleted.includes(token);
  const hasPendingLinks =
    Array.isArray(pendingEdits?.l) && pendingEdits.l.length > 0;
  const [showRedirect, setShowRedirect] = useState(false);
  const [redirectLabel, setRedirectLabel] = useState("X.com");
  const [avatarPrompt, setAvatarPrompt] = useState(null);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const providerKeyByLabel = {
    Discord: "discord",
    X: "twitter",
    GitHub: "github",
  };

  const getDiscordAvatarKey = (id, handle) =>
    `discord_avatar_url:${id}:${handle}`;
  const getXAvatarKey = (id, handle) => `x_avatar_url:${id}:${handle}`;
  const getGithubAvatarKey = (id, handle) =>
    `github_avatar_url:${id}:${handle}`;
  const buildDiscordAvatarUrl = (id, avatar) => {
    if (!id || !avatar) return null;
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=4096`;
  };
  const upgradeXAvatarUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    const trimmed = url.trim().replace(/^,+/, "");
    const withName = trimmed.replace(/([?&])name=normal\b/i, "$1name=original");
    const replaced = withName.replace(/_(normal|bigger|mini)(\.[a-z0-9]+)(\?.*)?$/i, "$2$3");
    return replaced;
  };
  const normalizeHandleKey = (value) => (value || "").trim().toLowerCase();
  const parseXHandleFromUrl = (rawUrl) => {
    const m = (rawUrl || "").replace(/\/$/, "").match(/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
    return m ? m[1].trim() : null;
  };
  const parseGithubHandleFromUrl = (rawUrl) => {
    const m = (rawUrl || "").replace(/\/$/, "").match(/github\.com\/([^/?#]+)/i);
    return m ? m[1].trim() : null;
  };
  const parseDiscordTargetFromUrl = (rawUrl) => {
    const m = (rawUrl || "").replace(/\/$/, "").match(/(?:discord\.com|discordapp\.com)\/users\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  };
  const getXHandle = (s) => {
    const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
    const tw = ids.find((i) => i?.provider === "twitter")?.identity_data || {};
    const candidates = [
      tw.username,
      tw.screen_name,
      tw.preferred_username,
      tw.user_name,
      tw.name
    ].filter(Boolean);
    const h = candidates.find((v) => typeof v === "string" && v.trim());
    return h ? h.replace(/^@/, "") : null;
  };
  const getGithubHandle = (s) => {
    const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
    const gh = ids.find((i) => i?.provider === "github")?.identity_data || {};
    const candidates = [
      gh.user_name,
      gh.login,
      gh.preferred_username
    ].filter(Boolean);
    const h = candidates.find((v) => typeof v === "string" && v.trim());
    return h ? h.replace(/^@/, "") : null;
  };
  const getDiscordId = (s) => {
    const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
    const identity = ids.find((i) => i?.provider === "discord");
    const candidates = [
      identity?.id,
      identity?.identity_data?.id,
      identity?.identity_data?.sub
    ].filter(Boolean);
    const h = candidates.find((v) => (typeof v === "string" || typeof v === "number") && String(v).trim());
    return h ? String(h).trim() : null;
  };
  const getDiscordUsername = async (s) => {
    const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
    const identity = ids.find((i) => i?.provider === "discord");
    const data = identity?.identity_data || {};
    const userMeta = s?.user?.user_metadata || {};
    const username = data.username || data.preferred_username || data.user_name || data.name
      || userMeta.username || userMeta.preferred_username || userMeta.user_name || userMeta.name || userMeta.full_name || null;
    const globalName = data.global_name || userMeta.global_name || null;
    const discriminator = data.discriminator || userMeta.discriminator || null;
    const candidates = [];
    if (username) {
      candidates.push(username);
      if (discriminator && String(discriminator) != "0") {
        candidates.push(`${username}#${discriminator}`);
      }
    }
    if (globalName) candidates.push(globalName);
    const h = candidates.find((v) => typeof v === "string" && v.trim());
    if (h) return h.trim();

    const providerToken = s?.provider_token || s?.user?.provider_token || null;
    if (providerToken) {
      try {
        const res = await fetch("https://discord.com/api/users/@me", {
          headers: {
            Authorization: `Bearer ${providerToken}`
          }
        });
        if (res.ok) {
          const me = await res.json();
          const uname = me?.username || null;
          const gname = me?.global_name || null;
          const disc = me?.discriminator || null;
          if (uname) {
            if (disc && String(disc) != "0") return `${uname}#${disc}`;
            return uname;
          }
          if (gname) return gname;
        } else {
          console.warn("[VERIFY WARN] Discord /users/@me failed:", res.status);
        }
      } catch (err) {
        console.warn("[VERIFY WARN] Discord /users/@me error:", err);
      }
    }

    return null;
  };
  const normalizeDiscordHandle = (value) =>
    (value || "")
      .trim()
      .replace(/^@/, "")
      .replace(/#0$/, "")
      .toLowerCase();
  const getDiscordAvatarUrl = async (s) => {
    const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
    const identity = ids.find((i) => i?.provider === "discord");
    const data = identity?.identity_data || {};
    const userMeta = s?.user?.user_metadata || {};
    const id = data.id || data.sub || identity?.id || userMeta.id || userMeta.sub || null;
    const avatar = data.avatar || userMeta.avatar || null;
    const direct = buildDiscordAvatarUrl(id, avatar);
    if (direct) return direct;

    const providerToken = s?.provider_token || s?.user?.provider_token || null;
    if (!providerToken) return null;
    try {
      const res = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${providerToken}`
        }
      });
      if (res.ok) {
        const me = await res.json();
        return buildDiscordAvatarUrl(me?.id, me?.avatar);
      }
    } catch (err) {
      console.warn("[VERIFY WARN] Discord /users/@me avatar error:", err);
    }
    return null;
  };
  const storeDiscordAvatarUrl = (url, handle) => {
    if (!url || !handle) return;
    localStorage.setItem(getDiscordAvatarKey(profile.id, handle), url);
  };
  const getXAvatarUrl = (s) => {
    const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
    const identity = ids.find((i) => i?.provider === "twitter");
    const data = identity?.identity_data || {};
    const userMeta = s?.user?.user_metadata || {};
    const candidates = [
      data.profile_image_url_https,
      data.profile_image_url,
      data.avatar_url,
      data.picture,
      data.image,
      userMeta.avatar_url,
      userMeta.picture,
      userMeta.profile_image_url,
      userMeta.profile_image_url_https
    ].filter(Boolean);
    const h = candidates.find((v) => typeof v === "string" && v.trim());
    return h ? upgradeXAvatarUrl(h.trim()) : null;
  };
  const storeXAvatarUrl = (url, handle) => {
    if (!url || !handle) return;
    localStorage.setItem(getXAvatarKey(profile.id, handle), url);
  };
  const getGithubAvatarUrl = async (s) => {
    const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
    const identity = ids.find((i) => i?.provider === "github");
    const data = identity?.identity_data || {};
    const userMeta = s?.user?.user_metadata || {};
    const candidates = [
      data.avatar_url,
      data.avatar,
      data.picture,
      userMeta.avatar_url,
      userMeta.picture
    ].filter(Boolean);
    const h = candidates.find((v) => typeof v === "string" && v.trim());
    if (h) return h.trim();

    const providerToken = s?.provider_token || s?.user?.provider_token || null;
    if (!providerToken) return null;
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${providerToken}`
        }
      });
      if (res.ok) {
        const me = await res.json();
        return me?.avatar_url || null;
      }
    } catch (err) {
      console.warn("[VERIFY WARN] GitHub /user avatar error:", err);
    }
    return null;
  };
  const storeGithubAvatarUrl = (url, handle) => {
    if (!url || !handle) return;
    localStorage.setItem(getGithubAvatarKey(profile.id, handle), url);
  };

  // stored values (read-only originals)
  const origCityId = profile.nearest_city_id || null;
  const origCityName = profile.nearest_city_name || "";

  // editable UI state — SAME AS OTHER FIELDS
  const [nearestCityDisplay, setNearestCityDisplay] = useState(origCityName);
  const [nearestCityId, setNearestCityId] = useState(origCityId);

  // Check for X link verification return
  useEffect(() => {
    const pId = localStorage.getItem("verifying_profile_id");
    const url = localStorage.getItem("verifying_link_url");

    // 🚀 IMMEDIATE LOG: Prove component mounted and read storage
    console.log("[VERIFY DEBUG] Component Mounted. Storage:", { pId, url, currentProfileId: profile.id });

    // Helper to update state
    const applyVerification = async (session) => {
      console.log("[VERIFY DEBUG] applyVerification started with session:", !!session);

      if (!session) {
        console.log("[VERIFY DEBUG] No session provided to applyVerification, aborting.");
        return;
      }

      // Retrieve state from URL params (preferred) or localStorage (fallback)
      const params = new URLSearchParams(window.location.search);
      const pIdParam = params.get("verify_pid");
      const urlParam = params.get("verify_url");

      const pId = pIdParam || localStorage.getItem("verifying_profile_id");
      const url = urlParam || localStorage.getItem("verifying_link_url");

      // Force convert both to string for comparison
      if (pId && url && String(pId) === String(profile.id)) {
        console.log("✅ OAuth verified for:", url);

        const getLinkedInData = (s) => {
          const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
          const li = ids.find((i) => i?.provider === 'linkedin_oidc')?.identity_data || {};

          // 1. Try to find a handle/vanity name directly
          const candidates = [
            li.vanityName,
            li.preferred_username,
          ].filter(Boolean);
          const handle = candidates.find((v) => typeof v === 'string' && v.trim())?.replace(/^@/, '') || null;

          // 2. Return all useful components for fuzzy matching
          return {
            handle,
            name: li.name,               // "Xiang Hao"
            given_name: li.given_name,   // "Xiang"
            family_name: li.family_name, // "Hao"
            email: li.email              // "xiang...@..."
          };
        };
        let verifiedDiscordId = null;
        let verifiedDiscordUrl = null;
        const isXUrl = /^(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\//i.test(url || "");
        const isLinkedInUrl = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i.test(url || "");
        const isGithubUrl = /^(https?:\/\/)?(www\.)?github\.com\//i.test(url || "");
        const isDiscordUrl = /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/users\//i.test(url || "");
        if (isXUrl) {
          const xUsername = getXHandle(session);
          console.log("[VERIFY DEBUG] xUsername from metadata:", xUsername);
          const mx = (url || "").replace(/\/$/, "").match(/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
          const targetUsername = mx ? mx[1] : null;
          console.log("[VERIFY DEBUG] targetUsername from url:", targetUsername);
          if (!xUsername || !targetUsername || xUsername.toLowerCase() !== targetUsername.toLowerCase()) {
            console.warn(`[VERIFY FAIL] Mismatch: @${xUsername} vs @${targetUsername}`);
            alert(`Verification Mismatch: Logged in as @${xUsername}, but verifying link for @${targetUsername}`);
            localStorage.removeItem("verifying_profile_id");
            localStorage.removeItem("verifying_link_url");
            return;
          }

          const avatarUrl = getXAvatarUrl(session);
          const handleKey = normalizeHandleKey(targetUsername);
          if (avatarUrl && handleKey) storeXAvatarUrl(avatarUrl, handleKey);
        }
        if (isLinkedInUrl) {
          const liData = getLinkedInData(session);
          console.log("[VERIFY DEBUG] liData:", liData);

          const ml = (url || "").replace(/\/$/, "").match(/linkedin\.com\/in\/([^/?#]+)/i);
          const targetVanity = ml ? ml[1] : null;
          console.log("[VERIFY DEBUG] targetVanity from url:", targetVanity);

          let match = false;
          const t = (targetVanity || "").toLowerCase();

          // Strategy 1: Direct Handle Match
          if (liData.handle && liData.handle.toLowerCase() === t) {
            match = true;
            console.log("[VERIFY] Strategy 1 (Handle) matched");
          }

          // Strategy 2: Name Component Match (Robust)
          // e.g. "Xiang Hao" vs "xianghaosuc"
          // Require BOTH parts of name to be present in the handle
          if (!match && liData.given_name && liData.family_name) {
            const g = liData.given_name.toLowerCase();
            const f = liData.family_name.toLowerCase();
            // Ensure names are significant (>1 char) to avoid matching "A B"
            if (g.length > 1 && f.length > 1 && t.includes(g) && t.includes(f)) {
              match = true;
              console.log("[VERIFY] Strategy 2 (Name Components) matched");
            }
          }

          // Strategy 3: Email Match
          // e.g. email "xianghaosuc@gmail.com" matches handle "xianghaosuc"
          if (!match && liData.email) {
            const emailUser = liData.email.split('@')[0].toLowerCase();
            if (emailUser === t || emailUser.includes(t) || t.includes(emailUser)) {
              match = true;
              console.log("[VERIFY] Strategy 3 (Email) matched");
            }
          }

          if (!match) {
            console.warn(`[VERIFY FAIL] No match found for ${t}`);
            alert(
              `Verification Mismatch\n\n` +
              `Logged in as: ${liData.name || liData.email || "(unknown)"}\n` +
              `Target Profile: ${targetVanity || "(unknown)"}\n\n` +
              `Your LinkedIn login Name or Email does not clearly match the profile URL.\n` +
              `Please ensure the URL contains your name or matches your email.`
            );
            localStorage.removeItem("verifying_profile_id");
            localStorage.removeItem("verifying_link_url");

            // Clear URL params to prevent loop
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("verify_pid");
            cleanUrl.searchParams.delete("verify_url");
            window.history.replaceState({}, "", cleanUrl.toString());
            return;
          }
        }
        if (isGithubUrl) {
          const ghHandle = getGithubHandle(session);
          console.log("[VERIFY DEBUG] ghHandle from metadata:", ghHandle);
          const m = (url || "").replace(/\/$/, "").match(/github\.com\/([^/?#]+)/i);
          const targetGh = m ? m[1] : (url || "").replace(/\/$/, "").split('/').pop();
          console.log("[VERIFY DEBUG] targetGithub from url:", targetGh);
          if (!ghHandle || !targetGh || ghHandle.toLowerCase() !== targetGh.toLowerCase()) {
            console.warn(`[VERIFY FAIL] Mismatch: ${ghHandle} vs ${targetGh}`);
            alert(`Verification Mismatch: Logged in as ${ghHandle}, but verifying link for ${targetGh}`);
            localStorage.removeItem("verifying_profile_id");
            localStorage.removeItem("verifying_link_url");
            return;
          }

          const avatarUrl = await getGithubAvatarUrl(session);
          const handleKey = normalizeHandleKey(targetGh);
          if (avatarUrl && handleKey) storeGithubAvatarUrl(avatarUrl, handleKey);
        }
        if (isDiscordUrl) {
          const discordId = getDiscordId(session);
          const discordUsername = await getDiscordUsername(session);
          console.log("[VERIFY DEBUG] discordUsername from metadata:", discordUsername);
          const m = (url || "").replace(/\/$/, "").match(/(?:discord\.com|discordapp\.com)\/users\/([^/?#]+)/i);
          const targetDiscord = m ? m[1] : (url || "").replace(/\/$/, "").split('/').pop();
          const targetDecoded = targetDiscord ? decodeURIComponent(targetDiscord) : null;
          console.log("[VERIFY DEBUG] targetDiscord from url:", targetDecoded);
          const targetNorm = normalizeDiscordHandle(targetDecoded);
          const isNumericTarget = /^[0-9]+$/.test(targetNorm);
          const usernameCandidates = [discordUsername]
            .filter(Boolean)
            .flatMap((name) => {
              const normalized = normalizeDiscordHandle(name);
              const base = normalized.replace(/#\d+$/, "");
              return [normalized, base].filter(Boolean);
            });
          let match = false;

          if (isNumericTarget) {
            match = !!discordId && String(discordId) === String(targetNorm);
          } else {
            match = !!targetNorm && usernameCandidates.includes(targetNorm);
          }

          if (!match) {
            console.warn(`[VERIFY FAIL] Mismatch: ${discordUsername || discordId} vs ${targetDecoded}`);
            alert(`Verification Mismatch: Logged in as ${discordUsername || discordId || "(unknown)"}, but verifying link for ${targetDecoded || "(unknown)"}`);
            localStorage.removeItem("verifying_profile_id");
            localStorage.removeItem("verifying_link_url");
            return;
          }

          const avatarUrl = await getDiscordAvatarUrl(session);
          const handleKey = normalizeHandleKey(targetNorm);
          if (avatarUrl && handleKey) storeDiscordAvatarUrl(avatarUrl, handleKey);
          if (discordId) {
            verifiedDiscordId = String(discordId);
            verifiedDiscordUrl = `https://discord.com/users/${verifiedDiscordId}`;
          }
        }

        // 2. Update Database
        try {
          console.log("[VERIFY DEBUG] Attempting DB update...");
          const normalizedUrl = url.replace(/\/$/, "");
          let handle = normalizedUrl.split('/').pop();
          if (/(?:x\.com|twitter\.com)\//i.test(normalizedUrl)) {
            const m = normalizedUrl.match(/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
            handle = m ? m[1] : handle;
          }
          if (/github\.com\//i.test(normalizedUrl)) {
            const m = normalizedUrl.match(/github\.com\/([^/?#]+)/i);
            handle = m ? m[1] : handle;
          }
          if (/discord(?:app)?\.com\/users\//i.test(normalizedUrl)) {
            const m = normalizedUrl.match(/users\/([0-9]+)/i);
            handle = m ? m[1] : handle;
          }
          if (/linkedin\.com\/in\//i.test(normalizedUrl)) {
            const m = normalizedUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
            handle = m ? m[1] : handle;
          }
          let hosts = [];
          if (isXUrl) hosts = ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'];
          if (isLinkedInUrl) hosts = ['linkedin.com', 'www.linkedin.com'];
          if (isGithubUrl) hosts = ['github.com', 'www.github.com'];
          if (isDiscordUrl) hosts = ['discord.com', 'www.discord.com', 'discordapp.com', 'www.discordapp.com'];
          const schemes = ['https://'];
          const variants = [];
          for (const h of hosts) {
            for (const s of schemes) {
              const pathPrefix = isLinkedInUrl ? '/in/' : (isDiscordUrl ? '/users/' : '/');
              variants.push(`${s}${h}${pathPrefix}${handle}`);
              variants.push(`${s}${h}${pathPrefix}${handle}/`);
            }
          }

          const updatePayload = {
            is_verified: true,
            updated_at: new Date().toISOString()
          };
          if (isDiscordUrl && verifiedDiscordUrl) {
            updatePayload.url = verifiedDiscordUrl;
          }

          let { data, error } = await supabase
            .from('zcasher_links')
            .update(updatePayload)
            .eq('zcasher_id', profile.id)
            .in('url', variants)
            .select();

          if ((!data || data.length === 0) && !error) {
            const patternX = `%://x.com/${handle}%`;
            const patternTw = `%://twitter.com/${handle}%`;
            const patternWX = `%://www.x.com/${handle}%`;
            const patternWT = `%://www.twitter.com/${handle}%`;
            const patternLI = `%://linkedin.com/in/${handle}%`;
            const patternWLI = `%://www.linkedin.com/in/${handle}%`;
            const patternGH = `%://github.com/${handle}%`;
            const patternWGH = `%://www.github.com/${handle}%`;
            const patternD1 = `%://discord.com/users/${handle}%`;
            const patternD2 = `%://www.discord.com/users/${handle}%`;
            const patternDA = `%://discordapp.com/users/${handle}%`;
            const patternWDA = `%://www.discordapp.com/users/${handle}%`;
            const { data: data2, error: error2 } = await supabase
              .from('zcasher_links')
              .update(updatePayload)
              .eq('zcasher_id', profile.id)
              .or(`url.ilike.${patternX},url.ilike.${patternTw},url.ilike.${patternWX},url.ilike.${patternWT},url.ilike.${patternLI},url.ilike.${patternWLI},url.ilike.${patternGH},url.ilike.${patternWGH},url.ilike.${patternD1},url.ilike.${patternD2},url.ilike.${patternDA},url.ilike.${patternWDA}`)
              .select();
            data = data2; error = error2;
          }

          if (error) {
            console.error("[VERIFY ERROR] DB Update error:", error);
            throw error;
          }
          console.log("[VERIFY DEBUG] DB Update success. Rows affected:", data?.length, data);

          if (!data || data.length === 0) {
            console.warn("[VERIFY WARN] No rows updated! Check if zcasher_id and url match exactly in DB.");
            // Try to list the user's links to debug
            const { data: userLinks } = await supabase.from('zcasher_links').select('*').eq('zcasher_id', profile.id);
            console.log("[VERIFY DEBUG] User's actual links in DB:", userLinks);
          } else {
            console.log("✅ Database updated successfully");
            // Show success toast/alert only on success
            // alert("Verification Successful!"); // Optional: Feedback to user
          }

        } catch (err) {
          console.error("Database update failed:", err);
        }

        // 3. Update Local UI
        setForm(prev => ({
          ...prev,
          links: prev.links.map(l => {
            const u1 = (l.url || "").trim().replace(/\/$/, "");
            const u2 = (url || "").trim().replace(/\/$/, "");
            // Mark verified
            if (u1 !== u2) return l;
            return {
              ...l,
              is_verified: true,
              url: isDiscordUrl && verifiedDiscordUrl ? verifiedDiscordUrl : l.url
            };
          })
        }));

        // Clear auth context without a full page reload
        setTimeout(() => {
          localStorage.removeItem("verifying_profile_id");
          localStorage.removeItem("verifying_link_url");
          setShowRedirect(false);
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("verify_pid");
          cleanUrl.searchParams.delete("verify_url");
          window.history.replaceState({}, "", cleanUrl.toString());
        }, 1000);
      } else {
        if (!pId) console.log("[VERIFY DEBUG] Missing pId in localStorage");
        if (!url) console.log("[VERIFY DEBUG] Missing url in localStorage");
        if (pId && String(pId) !== String(profile.id)) console.log("[VERIFY DEBUG] ID mismatch:", pId, "vs", profile.id);
      }
    };

    // 1. Check immediate session (if already hydrated)
    // Add a small delay to ensure Supabase client is ready
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log("[VERIFY DEBUG] Immediate session check:", !!session);
        if (session) applyVerification(session);
      });
    }, 500);

    // 2. Listen for auth state change (e.g. processing URL fragment)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      // Handle both SIGNED_IN (redirect) and TOKEN_REFRESHED (possible initial state)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || (event === 'INITIAL_SESSION' && session)) {
        applyVerification(session);
      }
    });

    // 🚀 FORCE CHECK: Check immediately AND with a delay to catch the session
    const checkSession = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log("[VERIFY DEBUG] Force session check:", !!session);
        if (session) applyVerification(session);
      });
    };

    checkSession();
    setTimeout(checkSession, 1000);
    setTimeout(checkSession, 3000);

    return () => subscription.unsubscribe();
  }, [profile.id]);

  const startOAuth = (providerKey, url) =>
    startOAuthVerification({
      providerKey,
      profile,
      url,
      setShowRedirect,
      setRedirectLabel,
    });

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
      };
    });
  }, [profile, links]);

  // Form state
  const [form, setForm] = useState({
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
  const [imageUrlReason, setImageUrlReason] = useState(null);

  useEffect(() => {
    const { valid, reason } = isValidImageUrl(form.profile_image_url);
    setImageUrlValid(valid);
    setImageUrlReason(reason);
  }, [form.profile_image_url]);

  useEffect(() => {
    // auto reset links when profile or links prop changes
    setForm((prev) => ({
      ...prev,
      links: originalLinks.map((l) => ({ ...l })),
    }));
  }, [originalLinks]);

  // Keep originals for placeholders
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


  // Profile field diffs including deletions
  useEffect(() => {
    const changed = {};
    // nearest city change detection
    // RULE: Only emit c: token when:
    // 1) User actually selected a city OR cleared one
    // 2) Result differs from DB
    let cityToken = undefined;

    // Case 1: user selected a city from dropdown
    if (nearestCityId && nearestCityId !== profile.nearest_city_id) {
      cityToken = String(nearestCityId);
    }

    // Case 2: user cleared city
    if (deletedCity && profile.nearest_city_id) {
      cityToken = "-";
    }

    // Only apply token if a real change happened
    if (cityToken !== undefined) {
      changed.c = cityToken;
    }



    // normal changed fields
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


    // deletion tokens
    // deleted fields go into d:[]
    const deleted = [];

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
    if (ProfileEditor._lastPending !== changedStr) {
      ProfileEditor._lastPending = changedStr;
      setPendingEdits("profile", changed);
    }
  }, [
    form.address,
    form.name,
    form.display_name,
    form.bio,
    form.profile_image_url,

    nearestCityId,            // <<< REQUIRED
    profile.nearest_city_id,  // <<< REQUIRED
    deletedCity,
    imageUrlValid,

    originals.address,
    originals.name,
    originals.display_name,
    originals.bio,
    originals.profile_image_url,

    deletedFields.address,
    deletedFields.name,
    deletedFields.display_name,
    deletedFields.bio,
    deletedFields.profile_image_url,

    setPendingEdits
  ]);
  // Compute link tokens
  useEffect(() => {
    const effectTokens = [];

    // Index originals by id and remember their urls
    const originalById = new Map();
    const originalUrlSet = new Set();

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

    // Start from existing link tokens
    let normalizedVerify = Array.isArray(pendingEdits?.l)
      ? [...pendingEdits.l]
      : [];

    // Normalize +! tokens when the user edits a pending verified new link
    for (const token of pendingEdits?.l || []) {
      if (!token.startsWith("+!")) continue;
      const oldUrl = token.slice(2);
      const stillExists = form.links.some(
        (l) => (l.url || "").trim() === oldUrl.trim()
      );

      if (!stillExists) {
        // remove old +! token
        normalizedVerify = normalizedVerify.filter((t) => t !== token);
        // find a new, non-original url to move the +! onto
        const newUrl = form.links
          .map((l) => (l.url || "").trim())
          .find((u) => u && !originalUrlSet.has(u));
        if (newUrl) normalizedVerify.push(`+!${newUrl}`);
      }
    }

    // Apply your rules:
    // - -id only when an existing link is removed or cleared
    // - +id:newUrl when an existing link is edited
    // - +url when a brand new link is created
    for (const row of form.links) {
      const id = row.id ?? null;
      const newUrlRaw = (row.url || "").trim();
      const { valid: urlValid } = isValidUrl(newUrlRaw);
      const newUrl = urlValid ? newUrlRaw : "";   // invalid URLs are treated as blank

      if (id) {
        const original = originalById.get(String(id));
        const originalUrl = original ? original.url : "";

        if (newUrl === originalUrl) {
          // unchanged existing link
          continue;
        }

        if (!newUrl) {
          // If invalid, treat it as empty but DO NOT delete verified links
          effectTokens.push(`-${id}`);
          continue;
        }


        // existing link edited
        effectTokens.push(`+${id}:${newUrl}`);
      } else {
        // new link row
        if (!newUrl) continue;

        const isNew = !originalUrlSet.has(newUrl);
        const verifyToken = `+!${newUrl}`;
        const isExplicitVerify = normalizedVerify.includes(verifyToken);

        if (isNew && !isExplicitVerify) {
          // new link added
          effectTokens.push(`+${newUrl}`);
        }
      }
    }

    // Preserve all existing tokens EXCEPT ones we explicitly normalize away.
    // (This keeps -id and +url tokens from being discarded when adding a new blank row.)

    const preservedOld = Array.isArray(normalizedVerify)
      ? normalizedVerify.filter((t) => {
        // explicit verification tokens
        if (/^![0-9]+$/.test(t) || /^\+!/.test(t)) return true;

        // removal tokens
        if (/^-[0-9]+$/.test(t)) return true;

        // existing-link edit tokens — KEEP ONLY the latest edit for this id
        if (/^\+[0-9]+:/.test(t)) {
          const id = t.slice(1, t.indexOf(":"));
          const original = originalById.get(id);
          const currentUrl = currentById.get(id) || "";
          const { valid: currentValid } = isValidUrl(currentUrl);

          if (!currentUrl || !currentValid) return false;
          if (original && currentUrl === original.url) return false;

          // discard old edits if a new +id:newUrl exists in effectTokens
          const hasNewer = effectTokens.some((et) => et.startsWith(`+${id}:`));
          return !hasNewer;
        }

        // new-link tokens: keep ONLY if this URL still exists AND is not explicitly verified
        if (/^\+[^!]/.test(t) && !t.includes(":")) {
          const url = t.slice(1).trim();
          const hasExplicitVerify = normalizedVerify.includes(`+!${url}`);
          return currentUrls.has(url) && !hasExplicitVerify;
        }

        return false;
      })
      : [];

    const uniqTokens = (arr) => {
      const seen = new Set();
      const out = [];
      for (const t of arr) {
        if (!seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      }
      return out;
    };

    // Union of new effect tokens and preserved old tokens
    const merged = uniqTokens([...effectTokens, ...preservedOld]);

    // Cleanup:
    // - drop !id when there is a -id
    // - drop +!url when that url no longer exists in current form.links
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
    if (ProfileEditor._lastLinks !== serialized) {
      ProfileEditor._lastLinks = serialized;
      setPendingEdits("l", filtered);
    }
  }, [form.links, originalLinks, pendingEdits?.l, setPendingEdits]);


  // Handlers
  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const applyDiscordAvatar = async (url) => {
    const target = parseDiscordTargetFromUrl(url);
    const targetKey = normalizeHandleKey(normalizeDiscordHandle(target));
    if (!targetKey) {
      setAvatarPrompt({ provider: "Discord", url });
      return;
    }

    let nextUrl = localStorage.getItem(getDiscordAvatarKey(profile.id, targetKey));
    if (!nextUrl) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const discordId = getDiscordId(session);
        const discordUsername = await getDiscordUsername(session);
        const isNumericTarget = /^[0-9]+$/.test(targetKey);
        const usernameCandidates = [discordUsername]
          .filter(Boolean)
          .flatMap((name) => {
            const normalized = normalizeDiscordHandle(name);
            const base = normalized.replace(/#\d+$/, "");
            return [normalized, base].filter(Boolean);
          });
        const match = isNumericTarget
          ? !!discordId && String(discordId) === String(targetKey)
          : usernameCandidates.includes(targetKey);

        if (!match) {
          setAvatarPrompt({ provider: "Discord", url });
          return;
        }

        nextUrl = await getDiscordAvatarUrl(session);
        if (nextUrl) storeDiscordAvatarUrl(nextUrl, targetKey);
      }
    }

    if (!nextUrl) {
      setAvatarPrompt({ provider: "Discord", url });
      return;
    }

    setDeletedFields((prev) => ({ ...prev, profile_image_url: false }));
    handleChange("profile_image_url", nextUrl);
  };
  const applyXAvatar = async (url) => {
    const target = parseXHandleFromUrl(url);
    const targetKey = normalizeHandleKey(target);
    if (!targetKey) {
      setAvatarPrompt({ provider: "X", url });
      return;
    }

    let nextUrl = localStorage.getItem(getXAvatarKey(profile.id, targetKey));
    if (!nextUrl) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const xHandle = getXHandle(session);
        if (!xHandle || normalizeHandleKey(xHandle) !== targetKey) {
          setAvatarPrompt({ provider: "X", url });
          return;
        }
        nextUrl = getXAvatarUrl(session);
        if (nextUrl) storeXAvatarUrl(nextUrl, targetKey);
      }
    }

    if (!nextUrl) {
      setAvatarPrompt({ provider: "X", url });
      return;
    }

    setDeletedFields((prev) => ({ ...prev, profile_image_url: false }));
    handleChange("profile_image_url", nextUrl);
  };
  const applyGithubAvatar = async (url) => {
    const target = parseGithubHandleFromUrl(url);
    const targetKey = normalizeHandleKey(target);
    if (!targetKey) {
      setAvatarPrompt({ provider: "GitHub", url });
      return;
    }

    let nextUrl = localStorage.getItem(getGithubAvatarKey(profile.id, targetKey));
    if (!nextUrl) {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(targetKey)}`);
        if (res.ok) {
          const data = await res.json();
          nextUrl = data?.avatar_url || null;
          if (nextUrl) storeGithubAvatarUrl(nextUrl, targetKey);
        }
      } catch (err) {
        console.warn("[VERIFY WARN] GitHub avatar fetch error:", err);
      }
    }

    if (!nextUrl) {
      setAvatarPrompt({ provider: "GitHub", url });
      return;
    }

    setDeletedFields((prev) => ({ ...prev, profile_image_url: false }));
    handleChange("profile_image_url", nextUrl);
  };

  const handleLinkChange = (uid, value) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((l) => (l._uid === uid ? { ...l, url: value } : l)),
    }));
  };

  const handleSocialLinkChange = (uid, value) => {
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
          id: null,
          url: "",
          platform: "X",
          username: "",
          otherUrl: "",
          valid: true,
          reason: null,
          is_verified: false,
          verification_expires_at: null,
          _uid: crypto.randomUUID(),
        },
      ],
    }));

  const removeLink = (uid) =>
    setForm((prev) => {
      const removed = prev.links.find((l) => l._uid === uid);
      const links = prev.links.filter((l) => l._uid !== uid);
      if (removed?.id) appendLinkToken(pendingEdits, setPendingEdits, `-${removed.id}`);
      return { ...prev, links };
    });

  const resetLinks = () => {
    setForm((prev) => ({
      ...prev,
      links:
        originalLinks.length > 0
          ? originalLinks.map((l) => ({ ...l }))
          : [
            {
              id: null,
              url: "",
              is_verified: false,
              verification_expires_at: null,
              _uid: crypto.randomUUID(),
            },
          ],
    }));

    // clear link tokens only
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const filtered = prev.filter(
      (t) => !/^[-+!]/.test(t) && !/^\+!/.test(t)
    );
    setPendingEdits("l", filtered);
  };


  return (

    <div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
      <RedirectModal isOpen={showRedirect} label={redirectLabel} />
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

        {/* Address */}
        {/* ZCASH ADDRESS */}
        <div className="mb-3 text-center">

          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="addr" className="font-semibold text-gray-700">
                Zcash Address
              </label>
              {hasPendingField("address", "a") && (
                <span className={VERIFY_HINT_CLASS}>
                  Verify to apply edits
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative inline-block">
                <DeleteActionButton
                  disabled={!profile.address_verified}
                  isDeleted={deletedFields.address}
                  onClick={(e) => {
                    if (!profile.address_verified) {
                      const btn = e.currentTarget;
                      const popup = e.currentTarget.nextElementSibling;

                      btn.classList.remove("shake");
                      void btn.offsetWidth;
                      btn.classList.add("shake");

                      popup.classList.add("show");
                      clearTimeout(popup._timer);
                      popup._timer = setTimeout(() => {
                        popup.classList.remove("show");
                      }, 3000);

                      return;
                    }

                    setDeletedFields((prev) => {
                      const next = !prev.address;
                      if (next) {
                        setForm((f) => ({ ...f, address: "" }));
                      } else {
                        setForm((f) => ({ ...f, address: originals.address }));
                      }
                      return { ...prev, address: next };
                    });
                  }}
                />

                <div className="absolute fade-popup z-50 w-90 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs right-0 bottom-full mb-1">
                  Cannot change unverified address. <br /> Lost access? Create new profile.
                </div>
              </div>

              <HelpIcon text="Your Zcash address where verification codes are sent." />
            </div>
          </div>

          <input
            id="addr"
            type="text"
            value={form.address}
            placeholder={originals.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className={`${FIELD_CLASS} font-mono`}
          />
        </div>


        {/* USERNAME */}
        <div className="mb-3">

          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="name" className="font-semibold text-gray-700">
                Username
              </label>
              {hasPendingField("name", "n") && (
                <span className={VERIFY_HINT_CLASS}>
                  Verify to apply changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <DeleteActionButton
                isDeleted={deletedFields.name}
                onClick={() =>
                  setDeletedFields((prev) => {
                    const next = !prev.name;
                    if (next) {
                      setForm((f) => ({ ...f, name: "" }));
                    } else {
                      setForm((f) => ({ ...f, name: originals.name }));
                    }
                    return { ...prev, name: next };
                  })
                }
              />

              <HelpIcon text="Your unique handle on Zcash.me." />
            </div>
          </div>

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
        </div>

        {/* DISPLAY NAME */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="display_name" className="font-semibold text-gray-700">
                Display Name
              </label>
              {hasPendingField("display_name", "h") && (
                <span className={VERIFY_HINT_CLASS}>
                  Verify to apply changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <DeleteActionButton
                isDeleted={deletedFields.display_name}
                onClick={() =>
                  setDeletedFields((prev) => {
                    const next = !prev.display_name;
                    if (next) {
                      setForm((f) => ({ ...f, display_name: "" }));
                    } else {
                      setForm((f) => ({ ...f, display_name: originals.display_name }));
                    }
                    return { ...prev, display_name: next };
                  })
                }
              />

              <HelpIcon text="Your public display name." />
            </div>
          </div>

          <input
            id="display_name"
            type="text"
            value={form.display_name}
            placeholder={originals.display_name || "Enter display name"}
            onChange={(e) => handleChange("display_name", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>


        {/* BIOGRAPHY */}
        <div className="mb-3 relative">

          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="bio" className="font-semibold text-gray-700">
                Biography
              </label>
              {hasPendingField("bio", "b") && (
                <span className={VERIFY_HINT_CLASS}>
                  Verify to apply changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <DeleteActionButton
                isDeleted={deletedFields.bio}
                onClick={() =>
                  setDeletedFields((prev) => {
                    const next = !prev.bio;
                    if (next) {
                      setForm((f) => ({ ...f, bio: "" }));
                    } else {
                      setForm((f) => ({ ...f, bio: originals.bio }));
                    }
                    return { ...prev, bio: next };
                  })
                }
              />

              <HelpIcon text="Your current story arc in 100 characters or less." />
            </div>
          </div>

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

        {/* NEAREST CITY */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-gray-700">Nearest City</label>
              {pendingProfileEdits?.c && (
                <span className={VERIFY_HINT_CLASS}>
                  Verify to apply changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <DeleteActionButton
                isDeleted={deletedCity}
                onClick={() => {
                  const next = !deletedCity;
                  setDeletedCity(next);

                  if (next) {
                    // DELETE
                    setNearestCityId(null);
                    setNearestCityDisplay("");
                  } else {
                    // RESET
                    setNearestCityId(origCityId);
                    setNearestCityDisplay("");
                  }
                }}
              />

              <HelpIcon text="Select the city closest to you. This helps with regional discovery and relevance." />
            </div>
          </div>

          <CitySearchDropdown
            value={nearestCityDisplay}
            placeholder={
              !deletedCity && origCityId && nearestCityDisplay === ""
                ? origCityName
                : "Search nearest city…"
            }

            onChange={(val) => {
              if (typeof val === "string") {
                // user is typing
                setNearestCityDisplay(val);
                setNearestCityId(null);
              } else {
                // user selected a city
                setNearestCityDisplay(val.fullLabel);
                setNearestCityId(val.id);
              }
            }}
          />


        </div>

        {/* PROFILE IMAGE URL */}
        <div className="mb-3">

          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label htmlFor="pimg" className="font-semibold text-gray-700">
                Profile Image URL
              </label>
              {hasPendingField("profile_image_url", "i") && (
                <span className={VERIFY_HINT_CLASS}>
                  Verify to apply changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <DeleteActionButton
                isDeleted={deletedFields.profile_image_url}
                onClick={() =>
                  setDeletedFields((prev) => {
                    const next = !prev.profile_image_url;
                    if (next) {
                      setForm((f) => ({ ...f, profile_image_url: "" }));
                    } else {
                      setForm((f) => ({ ...f, profile_image_url: originals.profile_image_url }));
                    }
                    return { ...prev, profile_image_url: next };
                  })
                }
              />

              <HelpIcon text="Link to PNG or JPG. Search 'free image link host'." />
            </div>
          </div>

          <input
            id="pimg"
            type="text"
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
              className="text-xs px-2 py-1 border border-blue-400 text-blue-600 rounded hover:bg-blue-50"
            >
              Preview Avatar
            </button>
          </div>
          {!imageUrlValid && imageUrlReason && (
            <p className="text-xs text-red-600 mt-1">{imageUrlReason}</p>
          )}


        </div>

        {/* Links */}
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
          const original = originalLinks.find((o) => o.id === row.id) || {};
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
                  <span className="text-xs text-gray-500 italic">
                    Verify uaddr to authenticate links
                  </span>
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
                        onClick={() => applyDiscordAvatar(row.url)}
                        className="text-xs px-2 py-1 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
                      >
                        Use Discord Avatar
                      </button>
                    )}
                    {showXAvatarAction && (
                      <button
                        type="button"
                        onClick={() => applyXAvatar(row.url)}
                        className="text-xs px-2 py-1 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
                      >
                        Use X Avatar
                      </button>
                    )}
                    {showGithubAvatarAction && (
                      <button
                        type="button"
                        onClick={() => applyGithubAvatar(row.url)}
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

                      // X / Twitter verification flow
                      if (authProvider) {
                        startOAuth(authProvider.key, row.url);
                        return;
                      }

                      if (isPending) {
                        removeLinkToken(pendingEdits, setPendingEdits, token);
                      } else {
                        appendLinkToken(pendingEdits, setPendingEdits, token);
                      }
                    }}
                    className={`text-xs px-2 py-1 border rounded ${isPending || (showRedirect && isOAuthLink)
                      ? "text-yellow-700 border-yellow-400 bg-yellow-50"
                      : "text-blue-600 border-blue-400 hover:bg-blue-50"
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
          className="text-sm font-semibold text-blue-700 hover:underline mt-1"
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




