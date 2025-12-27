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

const FIELD_CLASS =
  "w-full rounded-2xl border border-[#0a1126]/60 px-3 py-2 text-sm bg-transparent outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400";

const isValidImageUrl = (url) => {
  if (!url) return { valid: true, reason: null };

  const trimmed = url.trim();
  const { valid } = isValidUrl(trimmed);
  if (!valid) {
    return { valid: false, reason: "Invalid URL format" };
  }

  if (!/\.(png|jpg)$/i.test(trimmed)) {
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
  Discord: ["discord.gg", "www.discord.gg"],
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


export default function ProfileEditor({ profile, links }) {
  // 🔥 RENDER DEBUG: Check if component actually renders
  console.log("[PROFILE EDITOR RENDER] ID:", profile.id, "Links count:", links?.length);

  const { setPendingEdits, pendingEdits } = useFeedback();
  const [showRedirect, setShowRedirect] = useState(false);
  const [redirectLabel, setRedirectLabel] = useState("X.com");

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

        const getXHandle = (s) => {
          const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
          const tw = ids.find((i) => i?.provider === 'twitter')?.identity_data || {};
          const candidates = [
            tw.username,
            tw.screen_name,
            tw.preferred_username,
            tw.user_name,
            tw.name
          ].filter(Boolean);
          const h = candidates.find((v) => typeof v === 'string' && v.trim());
          return h ? h.replace(/^@/, '') : null;
        };
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
        const getGithubHandle = (s) => {
          const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
          const gh = ids.find((i) => i?.provider === 'github')?.identity_data || {};
          const candidates = [
            gh.user_name,
            gh.login,
            gh.preferred_username
          ].filter(Boolean);
          const h = candidates.find((v) => typeof v === 'string' && v.trim());
          return h ? h.replace(/^@/, '') : null;
        };
        const getDiscordId = (s) => {
          const ids = Array.isArray(s?.user?.identities) ? s.user.identities : [];
          const identity = ids.find((i) => i?.provider === 'discord');

          // 1. Prefer the top-level 'id' from the identity record (this is the Provider User ID)
          // 2. Fallback to identity_data fields if available
          const candidates = [
            identity?.id,
            identity?.identity_data?.id,
            identity?.identity_data?.sub
          ].filter(Boolean);

          const h = candidates.find((v) => (typeof v === 'string' || typeof v === 'number') && String(v).trim());
          return h ? String(h).trim() : null;
        };

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
        }
        if (isDiscordUrl) {
          const discordId = getDiscordId(session);
          console.log("[VERIFY DEBUG] discordId from metadata:", discordId);
          const m = (url || "").replace(/\/$/, "").match(/(?:discord\.com|discordapp\.com)\/users\/([0-9]+)/i);
          const targetDiscordId = m ? m[1] : (url || "").replace(/\/$/, "").split('/').pop();
          console.log("[VERIFY DEBUG] targetDiscordId from url:", targetDiscordId);
          if (!discordId || !targetDiscordId || String(discordId) !== String(targetDiscordId)) {
            console.warn(`[VERIFY FAIL] Mismatch: ${discordId} vs ${targetDiscordId}`);
            alert(`Verification Mismatch: Logged in as ${discordId}, but verifying link for ${targetDiscordId}`);
            localStorage.removeItem("verifying_profile_id");
            localStorage.removeItem("verifying_link_url");
            return;
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

          let { data, error } = await supabase
            .from('zcasher_links')
            .update({
              is_verified: true,
              updated_at: new Date().toISOString()
            })
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
              .update({
                is_verified: true,
                updated_at: new Date().toISOString()
              })
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
            return u1 === u2 ? {
              ...l,
              is_verified: true
            } : l;
          })
        }));

        // 🔥 FORCE RELOAD to ensure fresh state
        setTimeout(() => {
          // Clear storage JUST BEFORE reload
          localStorage.removeItem("verifying_profile_id");
          localStorage.removeItem("verifying_link_url");
          setShowRedirect(false);

          // Navigate to clean URL (remove query params) to finish
          window.location.href = window.location.pathname;
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

  const handleXVerify = async (url) => {
    setShowRedirect(true);
    setRedirectLabel("X.com");
    localStorage.setItem("verifying_profile_id", profile.id);
    localStorage.setItem("verifying_link_url", url);

    const norm = (s = "") =>
      s
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
    const baseSlug = norm(profile.name || "");
    const uniqueSlug = `${baseSlug}-${profile.id}`;
    const returnUrl = `${window.location.origin}/${uniqueSlug}`;

    setTimeout(async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'twitter',
          options: {
            redirectTo: returnUrl,
            skipBrowserRedirect: false
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error("OAuth error:", error);
        setShowRedirect(false);
        alert("Verification failed: " + (error.message || "Unknown error"));
      }
    }, 1500);
  };
  const handleLinkedInVerify = async (url) => {
    setShowRedirect(true);
    setRedirectLabel("LinkedIn");
    localStorage.setItem("verifying_profile_id", profile.id);
    localStorage.setItem("verifying_link_url", url);
    const norm = (s = "") =>
      s
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
    const baseSlug = norm(profile.name || "");
    const uniqueSlug = `${baseSlug}-${profile.id}`;

    // Pass state in URL to survive cross-domain redirects or session clearing
    const returnUrlObj = new URL(`${window.location.origin}/${uniqueSlug}`);
    returnUrlObj.searchParams.set("verify_pid", profile.id);
    returnUrlObj.searchParams.set("verify_url", url);
    const returnUrl = returnUrlObj.toString();

    setTimeout(async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'linkedin_oidc',
          options: {
            redirectTo: returnUrl,
            skipBrowserRedirect: false
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error("OAuth error:", error);
        setShowRedirect(false);
        alert("Verification failed: " + (error.message || "Unknown error"));
      }
    }, 1500);
  };
  const handleGithubVerify = async (url) => {
    setShowRedirect(true);
    setRedirectLabel("GitHub");
    localStorage.setItem("verifying_profile_id", profile.id);
    localStorage.setItem("verifying_link_url", url);
    const norm = (s = "") =>
      s
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
    const baseSlug = norm(profile.name || "");
    const uniqueSlug = `${baseSlug}-${profile.id}`;

    // Pass state in URL to survive cross-domain redirects or session clearing
    const returnUrlObj = new URL(`${window.location.origin}/${uniqueSlug}`);
    returnUrlObj.searchParams.set("verify_pid", profile.id);
    returnUrlObj.searchParams.set("verify_url", url);
    const returnUrl = returnUrlObj.toString();

    setTimeout(async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: returnUrl,
            skipBrowserRedirect: false
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error("OAuth error:", error);
        setShowRedirect(false);
        alert("Verification failed: " + (error.message || "Unknown error"));
      }
    }, 1500);
  };
  const handleDiscordVerify = async (url) => {
    setShowRedirect(true);
    setRedirectLabel("Discord");
    localStorage.setItem("verifying_profile_id", profile.id);
    localStorage.setItem("verifying_link_url", url);
    const norm = (s = "") =>
      s
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
    const baseSlug = norm(profile.name || "");
    const uniqueSlug = `${baseSlug}-${profile.id}`;

    // Pass state in URL to survive cross-domain redirects or session clearing
    const returnUrlObj = new URL(`${window.location.origin}/${uniqueSlug}`);
    returnUrlObj.searchParams.set("verify_pid", profile.id);
    returnUrlObj.searchParams.set("verify_url", url);
    const returnUrl = returnUrlObj.toString();

    setTimeout(async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: {
            redirectTo: returnUrl,
            skipBrowserRedirect: false
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error("OAuth error:", error);
        setShowRedirect(false);
        alert("Verification failed: " + (error.message || "Unknown error"));
      }
    }, 1500);
  };

  // Normalize incoming DB links
  const originalLinks = useMemo(() => {
    const arr = Array.isArray(links) ? links : Array.isArray(profile.links) ? profile.links : [];
    return arr.map((l) => ({
      id: l.id ?? null,
      url: l.url ?? "",
      ...parseSocialUrl(l.url ?? ""),
      valid: true,
      reason: null,
      is_verified: !!l.is_verified,
      verification_expires_at: l.verification_expires_at || null,
      _uid: crypto.randomUUID()
    }));
  }, [profile, links]);

  // Form state
  const [form, setForm] = useState({
    address: "",
    name: "",
    bio: "",
    profile_image_url: "",
    links: originalLinks.map((l) => ({ ...l })),
  });

  const [deletedCity, setDeletedCity] = useState(false);


  const [deletedFields, setDeletedFields] = useState({
    address: false,
    name: false,
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
      bio: profile.bio || "",
      profile_image_url: profile.profile_image_url || "",
    }),
    [profile]
  );

  // Append token helper
  const appendLinkToken = (token) => {
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const next = prev.includes(token) ? prev : [...prev, token];
    setPendingEdits("l", next);
  };

  // Remove token helper
  const removeLinkToken = (token) => {
    const prev = Array.isArray(pendingEdits?.l) ? [...pendingEdits.l] : [];
    const next = prev.filter((t) => t !== token);
    setPendingEdits("l", next);
  };

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
    form.bio,
    form.profile_image_url,

    nearestCityId,            // <<< REQUIRED
    profile.nearest_city_id,  // <<< REQUIRED
    deletedCity,
    imageUrlValid,

    originals.address,
    originals.name,
    originals.bio,
    originals.profile_image_url,

    deletedFields.address,
    deletedFields.name,
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
      if (l.id) originalById.set(l.id, { ...l, url });
      if (url) originalUrlSet.add(url);
    }

    const currentUrls = new Set(
      form.links.map((l) => (l.url || "").trim()).filter(Boolean)
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
        const original = originalById.get(id);
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
          // discard old edits if a new +id:newUrl exists in effectTokens
          const hasNewer = effectTokens.some(et => et.startsWith(`+${id}:`));
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
      if (removed?.id) appendLinkToken(`-${removed.id}`);
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

  const isPendingToken = (token) =>
    Array.isArray(pendingEdits?.l) && pendingEdits.l.includes(token);

  return (

    <div className="w-full flex justify-center bg-transparent text-left text-sm text-gray-800 overflow-visible">
      <RedirectModal isOpen={showRedirect} label={redirectLabel} />
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
            <label htmlFor="addr" className="font-semibold text-gray-700">
              Zcash Address
            </label>

            <div className="flex items-center gap-3">
              <div className="relative inline-block">
                <button
                  type="button"
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
                  className={`text-xs underline font-normal ${profile.address_verified
                    ? deletedFields.address
                      ? "text-green-700"
                      : "text-red-600"
                    : "text-gray-400 cursor-not-allowed"
                    }`}
                >
                  {deletedFields.address ? "⌦ Reset" : "⌫ Delete"}
                </button>

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


        {/* NAME */}
        <div className="mb-3">

          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="name" className="font-semibold text-gray-700">
              Name
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
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
                className={`text-xs underline font-normal ${deletedFields.name ? "text-green-700" : "text-red-600"
                  }`}
              >
                {deletedFields.name ? "⌦ Reset" : "⌫ Delete"}
              </button>

              <HelpIcon text="Your public display name for this profile." />
            </div>
          </div>

          <input
            id="name"
            type="text"
            value={form.name}
            placeholder={originals.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>


        {/* BIOGRAPHY */}
        <div className="mb-3 relative">

          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="bio" className="font-semibold text-gray-700">
              Biography
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
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
                className={`text-xs underline ${deletedFields.bio ? "text-green-700" : "text-red-600"
                  }`}
              >
                {deletedFields.bio ? "⌦ Reset" : "⌫ Delete"}
              </button>

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
            <label className="font-semibold text-gray-700">Nearest City</label>

            <div className="flex items-center gap-3">
              <button
                type="button"
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
                className={`text-xs underline ${deletedCity ? "text-green-700" : "text-red-600"
                  }`}
              >
                {deletedCity ? "⌦ Reset" : "⌫ Delete"}
              </button>

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
            <label htmlFor="pimg" className="font-semibold text-gray-700">
              Profile Image URL
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
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
                className={`text-xs underline font-normal ${deletedFields.profile_image_url ? "text-green-700" : "text-red-600"
                  }`}
              >
                {deletedFields.profile_image_url ? "⌦ Reset" : "⌫ Delete"}
              </button>

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
          {!imageUrlValid && imageUrlReason && (
            <p className="text-xs text-red-600 mt-1">{imageUrlReason}</p>
          )}


        </div>

        {/* Links */}
        {/* Links */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">

            <label className="block font-semibold text-gray-700">Links</label>

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

              <HelpIcon text="Link verification requires OTP. Verified links cannot be changed." />

            </div>
          </div>
        </div>



        {form.links.map((row) => {
          const original = originalLinks.find((o) => o.id === row.id) || {};
          const isVerified = !!row.is_verified;
          const canVerify = !!profile.address_verified;
          const isX = /^(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\//i.test(row.url);
          const isLinkedIn = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i.test(row.url);
          const isGithub = /^(https?:\/\/)?(www\.)?github\.com\//i.test(row.url);
          const isDiscord = /^(https?:\/\/)?(www\.)?(discord\.com|discordapp\.com)\/users\//i.test(row.url);

          const token = row.id ? `!${row.id}` : row.url.trim() ? `+!${row.url.trim()}` : null;
          const isPending = token && isPendingToken(token);

          return (
            <div key={row._uid} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              {isVerified ? (
                <LinkInput
                  value={row.url}
                  onChange={(v) => handleLinkChange(row._uid, v)}
                  readOnly={true}
                  placeholder={original?.url || "example.com"}
                />
              ) : (
                <SocialLinkInput
                  value={row}
                  onChange={(v) => handleSocialLinkChange(row._uid, v)}
                />
              )}


              <div className="flex items-center gap-2">
                {!canVerify ? (

                  <span className="text-xs text-gray-500 italic">
                    Verify uaddr then URLs
                  </span>
                ) : isVerified ? (
                  <button
                    type="button"
                    disabled
                    className="text-xs px-2 py-1 text-green-700 border border-green-400 rounded opacity-60 cursor-not-allowed"
                  >
                    Verified
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) return;

                      // X / Twitter verification flow
                      if (isX) {
                        handleXVerify(row.url);
                        return;
                      }
                      if (isLinkedIn) {
                        handleLinkedInVerify(row.url);
                        return;
                      }
                      if (isGithub) {
                        handleGithubVerify(row.url);
                        return;
                      }
                      if (isDiscord) {
                        handleDiscordVerify(row.url);
                        return;
                      }

                      if (isPending) removeLinkToken(token);
                      else appendLinkToken(token);
                    }}
                    className={`text-xs px-2 py-1 border rounded ${isPending || (showRedirect && (isX || isLinkedIn || isGithub || isDiscord))
                      ? "text-yellow-700 border-yellow-400 bg-yellow-50"
                      : "text-blue-600 border-blue-400 hover:bg-blue-50"
                      }`}
                  >
                    {isPending || (showRedirect && (isX || isLinkedIn || isGithub || isDiscord)) ? "Pending" : "Verify"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeLink(row._uid)}
                  className="text-xs text-red-600 hover:underline"
                >
                  ⌫ Delete
                </button>
              </div>
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
              ⛉
              <span className="font-semibold">Verify</span> address to approve changes.
            </span>
          </p>
        </div>


      </div>
      <p className="text-sm text-gray-400 text-center mt-4">

      </p>


    </div>

  );
}
