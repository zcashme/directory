import { createSupabaseServerClient } from "./supabase-server";
import { normalizeSocialUsername } from "../src/utils/normalizeSocialLink";

const PLATFORM_CONFIG = {
  x: {
    label: "X",
    hosts: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
    includeNumericId: true,
  },
  twitter: {
    alias: "x",
  },
  github: {
    label: "GitHub",
    hosts: ["github.com", "www.github.com"],
  },
  instagram: {
    label: "Instagram",
    hosts: ["instagram.com", "www.instagram.com"],
  },
  reddit: {
    label: "Reddit",
    hosts: ["reddit.com", "www.reddit.com"],
  },
  linkedin: {
    label: "LinkedIn",
    hosts: ["linkedin.com", "www.linkedin.com"],
  },
  discord: {
    label: "Discord",
    hosts: [
      "discord.com",
      "www.discord.com",
      "discordapp.com",
      "www.discordapp.com",
      "discord.gg",
      "www.discord.gg",
    ],
  },
  tiktok: {
    label: "TikTok",
    hosts: ["tiktok.com", "www.tiktok.com"],
  },
  bluesky: {
    label: "Bluesky",
    hosts: ["bsky.app"],
  },
  mastodon: {
    label: "Mastodon",
    hosts: ["mastodon.social"],
  },
  snapchat: {
    label: "Snapchat",
    hosts: ["snapchat.com", "www.snapchat.com"],
  },
  telegram: {
    label: "Telegram",
    hosts: ["t.me", "www.t.me", "telegram.me", "www.telegram.me"],
  },
};

const resolvePlatformConfig = (platform = "") => {
  const key = String(platform || "").trim().toLowerCase();
  const config = PLATFORM_CONFIG[key];
  if (!config) return null;
  if (config.alias) return PLATFORM_CONFIG[config.alias] || null;
  return config;
};

const normalizeHandle = (raw = "", config) =>
  normalizeSocialUsername(decodeURIComponent(raw || "").trim(), config.label);

const buildUrlPatterns = (handle, config) => {
  const patterns = (config.hosts || []).map((host) => `%${host}/${handle}%`);
  if (config.includeNumericId) {
    patterns.push(`%/i/user/${handle}%`, `%/user/${handle}%`);
  }
  return patterns;
};

const pickBestCandidate = (candidates) => {
  if (!candidates.length) return null;
  return candidates
    .slice()
    .sort((a, b) => {
      const scoreA =
        (a.link.is_verified ? 2 : 0) + (a.profile.address_verified ? 1 : 0);
      const scoreB =
        (b.link.is_verified ? 2 : 0) + (b.profile.address_verified ? 1 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.profile.id - b.profile.id;
    })[0];
};

export async function lookupSocialAddress(platform, rawHandle) {
  const config = resolvePlatformConfig(platform);
  if (!config) {
    return {
      status: 400,
      body: { address: null, handle: null, error: "unsupported_platform" },
    };
  }

  const handle = normalizeHandle(rawHandle, config);
  if (!handle) {
    return {
      status: 400,
      body: { address: null, handle: null, error: "invalid_handle" },
    };
  }

  const supabase = createSupabaseServerClient();
  const urlPatterns = buildUrlPatterns(handle, config);

  const labelPromise = supabase
    .from("zcasher_links")
    .select("id,zcasher_id,label,url,is_verified")
    .ilike("label", handle)
    .limit(25);

  const urlPromise = urlPatterns.length
    ? supabase
        .from("zcasher_links")
        .select("id,zcasher_id,label,url,is_verified")
        .or(urlPatterns.map((p) => `url.ilike.${p}`).join(","))
        .limit(50)
    : Promise.resolve({ data: [], error: null });

  const [{ data: labelMatches, error: labelError }, { data: urlMatches, error: urlError }] =
    await Promise.all([labelPromise, urlPromise]);

  if (labelError || urlError) {
    return {
      status: 500,
      body: { address: null, handle, error: "lookup_failed" },
    };
  }

  const linksMap = new Map();
  (labelMatches || []).forEach((link) => linksMap.set(link.id, link));
  (urlMatches || []).forEach((link) => linksMap.set(link.id, link));
  const links = Array.from(linksMap.values());

  if (!links.length) {
    return {
      status: 404,
      body: { address: null, handle, error: "not_found" },
    };
  }

  const ids = Array.from(
    new Set(links.map((link) => link.zcasher_id).filter(Boolean))
  );

  const { data: profiles, error: profileError } = await supabase
    .from("zcasher")
    .select("id,address,name,address_verified")
    .in("id", ids);

  if (profileError) {
    return {
      status: 500,
      body: { address: null, handle, error: "profile_lookup_failed" },
    };
  }

  const profilesById = new Map(
    (profiles || []).map((profile) => [profile.id, profile])
  );

  const candidates = links
    .map((link) => ({
      link,
      profile: profilesById.get(link.zcasher_id),
    }))
    .filter((entry) => entry.profile?.address);

  const best = pickBestCandidate(candidates);

  if (!best) {
    return {
      status: 404,
      body: { address: null, handle, error: "address_missing" },
    };
  }

  return {
    status: 200,
    body: {
      link: {
        platform: config.label.toLowerCase(),
        handle,
        url: best.link.url,
        is_verified: !!best.link.is_verified,
      },
      address: best.profile.address,
      profile_name: best.profile.name,
      address_verified: !!best.profile.address_verified,
    },
  };
}
