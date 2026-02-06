// ui/social/useVerificationFlow.js

import { useEffect } from "react";
import { normalizeSocialUsername } from "@/lib/profile/usernameNormalizer";
import { getSession, onAuthStateChange } from "@/lib/supabase/auth";
import { updateLinkVerificationAction } from "@/lib/verification/updateLinkVerificationAction";
import {
  getXHandle,
  getGithubHandle,
  getDiscordId,
  getDiscordUsername,
  getXAvatarUrl,
  getGithubAvatarUrl,
  getDiscordAvatarUrl,
  normalizeHandleKey,
  normalizeDiscordHandle,
} from "@/lib/profile/providerAvatars";

export default function useVerificationFlow(profileId, setForm, setShowRedirect) {
  useEffect(() => {
    const applyVerification = async (session) => {
      if (!session) return;

      const params = new URLSearchParams(window.location.search);
      const pIdParam = params.get("verify_pid");
      const urlParam = params.get("verify_url");

      const pId = pIdParam || localStorage.getItem("verifying_profile_id");
      const url = urlParam || localStorage.getItem("verifying_link_url");

      if (!pId || !url || String(pId) !== String(profileId)) return;

      const getLinkedInData = (s) => {
        const identity = s?.user?.identities?.find?.((i) => i?.provider === "linkedin_oidc");
        const li = identity?.identity_data || {};
        const handle = li.vanityName || li.preferred_username || null;
        return {
          handle,
          name: li.name,
          given_name: li.given_name,
          family_name: li.family_name,
          email: li.email,
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
        const mx = (url || "").replace(/\/$/, "").match(/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
        const targetUsername = mx ? mx[1] : null;
        const normalizedX = normalizeSocialUsername(xUsername || "", "X").toLowerCase();
        const normalizedTarget = normalizeSocialUsername(targetUsername || "", "X").toLowerCase();
        if (!normalizedX || !normalizedTarget || normalizedX !== normalizedTarget) {
          alert(`Verification Mismatch: Logged in as @${xUsername}, but verifying link for @${targetUsername}`);
          localStorage.removeItem("verifying_profile_id");
          localStorage.removeItem("verifying_link_url");
          return;
        }

        const avatarUrl = getXAvatarUrl(session);
      }

      if (isLinkedInUrl) {
        const liData = getLinkedInData(session);
        const ml = (url || "").replace(/\/$/, "").match(/linkedin\.com\/in\/([^/?#]+)/i);
        const targetVanity = ml ? ml[1] : null;
        const normalizedTarget = normalizeSocialUsername(targetVanity || "", "LinkedIn").toLowerCase();

        let match = false;
        const t = normalizedTarget || "";
        const normalizedHandle = normalizeSocialUsername(liData.handle || "", "LinkedIn").toLowerCase();

        if (normalizedHandle && normalizedHandle.toLowerCase() === t) match = true;

        if (!match && liData.given_name && liData.family_name) {
          const g = liData.given_name.toLowerCase();
          const f = liData.family_name.toLowerCase();
          if (g.length > 1 && f.length > 1 && t.includes(g) && t.includes(f)) match = true;
        }

        if (!match && liData.email) {
          const emailUser = liData.email.split("@")[0].toLowerCase();
          if (emailUser === t || emailUser.includes(t) || t.includes(emailUser)) match = true;
        }

        if (!match) {
          alert(
            `Verification Mismatch\n\n` +
            `Logged in as: ${liData.name || liData.email || "(unknown)"}\n` +
            `Target Profile: ${targetVanity || "(unknown)"}\n\n` +
            `Your LinkedIn login Name or Email does not clearly match the profile URL.\n` +
            `Please ensure the URL contains your name or matches your email.`
          );
          localStorage.removeItem("verifying_profile_id");
          localStorage.removeItem("verifying_link_url");

          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("verify_pid");
          cleanUrl.searchParams.delete("verify_url");
          window.history.replaceState({}, "", cleanUrl.toString());
          return;
        }
      }

      if (isGithubUrl) {
        const ghHandle = getGithubHandle(session);
        const m = (url || "").replace(/\/$/, "").match(/github\.com\/([^/?#]+)/i);
        const targetGh = m ? m[1] : (url || "").replace(/\/$/, "").split("/").pop();
        const normalizedGh = normalizeSocialUsername(ghHandle || "", "GitHub").toLowerCase();
        const normalizedTarget = normalizeSocialUsername(targetGh || "", "GitHub").toLowerCase();
        if (!normalizedGh || !normalizedTarget || normalizedGh !== normalizedTarget) {
          alert(`Verification Mismatch: Logged in as ${ghHandle}, but verifying link for ${targetGh}`);
          localStorage.removeItem("verifying_profile_id");
          localStorage.removeItem("verifying_link_url");
          return;
        }

        const avatarUrl = await getGithubAvatarUrl(session);
      }

      if (isDiscordUrl) {
        const discordId = getDiscordId(session);
        const discordUsername = await getDiscordUsername(session);
        const m = (url || "").replace(/\/$/, "").match(/(?:discord\.com|discordapp\.com)\/users\/([^/?#]+)/i);
        const targetDiscord = m ? m[1] : (url || "").replace(/\/$/, "").split("/").pop();
        const targetDecoded = targetDiscord ? decodeURIComponent(targetDiscord) : null;
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
          alert(`Verification Mismatch: Logged in as ${discordUsername || discordId || "(unknown)"}, but verifying link for ${targetDecoded || "(unknown)"}`);
          localStorage.removeItem("verifying_profile_id");
          localStorage.removeItem("verifying_link_url");
          return;
        }

        const avatarUrl = await getDiscordAvatarUrl(session);
        if (discordId) {
          verifiedDiscordId = String(discordId);
          verifiedDiscordUrl = `https://discord.com/users/${verifiedDiscordId}`;
        }
      }

      try {
        const normalizedUrl = url.replace(/\/$/, "");
        let handle = normalizedUrl.split("/").pop();
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
        if (isXUrl) hosts = ["x.com", "twitter.com", "www.x.com", "www.twitter.com"];
        if (isLinkedInUrl) hosts = ["linkedin.com", "www.linkedin.com"];
        if (isGithubUrl) hosts = ["github.com", "www.github.com"];
        if (isDiscordUrl) hosts = ["discord.com", "www.discord.com", "discordapp.com", "www.discordapp.com"];
        const schemes = ["https://"];
        const variants = [];
        for (const h of hosts) {
          for (const s of schemes) {
            const pathPrefix = isLinkedInUrl ? "/in/" : isDiscordUrl ? "/users/" : "/";
            variants.push(`${s}${h}${pathPrefix}${handle}`);
            variants.push(`${s}${h}${pathPrefix}${handle}/`);
          }
        }

        const updatePayload = {
          is_verified: true,
          updated_at: new Date().toISOString(),
        };
        if (isDiscordUrl && verifiedDiscordUrl) {
          updatePayload.url = verifiedDiscordUrl;
        }

        const result = await updateLinkVerificationAction(profileId, handle, variants, updatePayload);
        if (!result.ok) {
          console.error("Failed to update link verification:", result.error);
        }
      } catch (err) {
      }

      setForm((prev) => ({
        ...prev,
        links: prev.links.map((l) => {
          const u1 = (l.url || "").trim().replace(/\/$/, "");
          const u2 = (url || "").trim().replace(/\/$/, "");
          if (u1 !== u2) return l;
          return {
            ...l,
            is_verified: true,
            url: isDiscordUrl && verifiedDiscordUrl ? verifiedDiscordUrl : l.url,
          };
        }),
      }));

      setTimeout(() => {
        localStorage.removeItem("verifying_profile_id");
        localStorage.removeItem("verifying_link_url");
        setShowRedirect(false);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("verify_pid");
        cleanUrl.searchParams.delete("verify_url");
        window.history.replaceState({}, "", cleanUrl.toString());
      }, 1000);
    };

    setTimeout(() => {
      getSession().then(({ data: { session } }) => {
        if (session) applyVerification(session);
      });
    }, 500);

    const {
      data: { subscription },
    } = onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || (event === "INITIAL_SESSION" && session)) {
        applyVerification(session);
      }
    });

    const checkSession = () => {
      getSession().then(({ data: { session } }) => {
        if (session) applyVerification(session);
      });
    };

    checkSession();
    setTimeout(checkSession, 1000);
    setTimeout(checkSession, 3000);

    return () => subscription.unsubscribe();
  }, [profileId, setForm, setShowRedirect]);
}
