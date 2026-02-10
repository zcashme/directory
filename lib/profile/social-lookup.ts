import { createSupabaseServerClient } from "../supabase/supabase-server";

type PlatformLabel = "X" | "GitHub" | "Instagram" | "Reddit" | "LinkedIn" | "Discord" | "TikTok" | "Bluesky" | "Mastodon" | "Snapchat" | "Telegram";

const HOSTS_MAP: Record<PlatformLabel, string[]> = {
  X: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
  GitHub: ["github.com", "www.github.com"],
  Instagram: ["instagram.com", "www.instagram.com"],
  Reddit: ["reddit.com", "www.reddit.com"],
  LinkedIn: ["linkedin.com", "www.linkedin.com"],
  Discord: [
    "discord.com",
    "www.discord.com",
    "discordapp.com",
    "www.discordapp.com",
    "discord.gg",
    "www.discord.gg"
  ],
  TikTok: ["tiktok.com", "www.tiktok.com"],
  Bluesky: ["bsky.app"],
  Mastodon: ["mastodon.social"],
  Snapchat: ["snapchat.com", "www.snapchat.com"],
  Telegram: ["t.me", "www.t.me", "telegram.me", "www.telegram.me"],
};

const normalizeSocialUsername = (raw: string = "", platform: PlatformLabel): string => {
  let v = raw.normalize("NFKC").trim();

  // Strip protocol
  v = v.replace(/^https?:\/\//i, "");

  // Strip leading @
  v = v.replace(/^@+/, "");

  // Strip quotes/backslashes that often come from pasted JSON or escaped strings
  v = v.replace(/["'\\]+/g, "");

  // Strip known platform domains
  const hosts = HOSTS_MAP[platform];
  if (hosts) {
    for (const h of hosts) {
      if (v.startsWith(h)) {
        v = v.slice(h.length);
      }
    }
  }

  // Remove common path prefixes
  v = v.replace(/^\/+/, "");
  v = v.replace(/^(user|users|in|profile|add)\//, "");

  // Strip query strings and fragments
  v = v.split("?")[0].split("#")[0];

  // Remove embedded mobile subdomains pasted into path
  v = v.replace(/^(mobile\.|m\.)?(x\.com|twitter\.com)\//i, "");

  // Keep only first path segment (no /status/, /reels/, etc)
  v = v.split("/")[0];

  // Remove trailing slashes
  v = v.replace(/\/+$/, "");

  // Block spaces and @ entirely
  v = v.replace(/[@\s]/g, "");

  return v;
};

interface PlatformConfig {
  label: PlatformLabel;
  hosts: string[];
  includeNumericId?: boolean;
}

interface PlatformAlias {
  alias: string;
}

type PlatformConfigEntry = PlatformConfig | PlatformAlias;

const PLATFORM_CONFIG: Record<string, PlatformConfigEntry> = {
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

const resolvePlatformConfig = (platform: string = ""): PlatformConfig | null => {
  const key = String(platform || "").trim().toLowerCase();
  const config = PLATFORM_CONFIG[key];
  if (!config) return null;
  if ("alias" in config) return (PLATFORM_CONFIG[config.alias] as PlatformConfig) || null;
  return config as PlatformConfig;
};

const normalizeHandle = (raw: string = "", config: PlatformConfig): string =>
  normalizeSocialUsername(decodeURIComponent(raw || "").trim(), config.label);

const buildUrlPatterns = (handle: string, config: PlatformConfig): string[] => {
  const patterns = (config.hosts || []).map((host) => `%${host}/${handle}%`);
  if (config.includeNumericId) {
    patterns.push(`%/i/user/${handle}%`, `%/user/${handle}%`);
  }
  return patterns;
};

interface ZcasherLink {
  id: number;
  zcasher_id: number;
  label: string;
  url: string;
  is_verified: boolean;
}

interface ZcasherProfile {
  id: number;
  address: string;
  name: string;
  address_verified: boolean;
}

interface Candidate {
  link: ZcasherLink;
  profile: ZcasherProfile;
}

const pickBestCandidate = (candidates: Candidate[]): Candidate | null => {
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

interface LookupError {
  status: 400 | 404 | 500;
  body: {
    address: null;
    handle: string | null;
    error: string;
  };
}

interface LookupSuccess {
  status: 200;
  body: {
    link: {
      platform: string;
      handle: string;
      url: string;
      is_verified: boolean;
    };
    address: string;
    profile_name: string;
    address_verified: boolean;
  };
}

type LookupResult = LookupError | LookupSuccess;

export async function lookupSocialAddress(platform: string, rawHandle: string): Promise<LookupResult> {
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

  if (!supabase) {
    return {
      status: 500,
      body: { address: null, handle, error: "server_misconfigured" },
    };
  }

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

  const linksMap = new Map<number, ZcasherLink>();
  (labelMatches || []).forEach((link) => linksMap.set(link.id, link as ZcasherLink));
  (urlMatches || []).forEach((link) => linksMap.set(link.id, link as ZcasherLink));
  const links = Array.from(linksMap.values());

  if (!links.length) {
    return {
      status: 404,
      body: { address: null, handle, error: "not_found" },
    };
  }

  const verifiedLinks = links.filter((link) => link.is_verified);
  if (!verifiedLinks.length) {
    return {
      status: 404,
      body: { address: null, handle, error: "not_verified" },
    };
  }

  const ids = Array.from(
    new Set(verifiedLinks.map((link) => link.zcasher_id).filter(Boolean))
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

  const profilesById = new Map<number, ZcasherProfile>(
    (profiles || []).map((profile) => [profile.id, profile as ZcasherProfile])
  );

  const candidates = verifiedLinks
    .map((link) => ({
      link,
      profile: profilesById.get(link.zcasher_id),
    }))
    .filter((entry): entry is Candidate => !!entry.profile?.address);

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
