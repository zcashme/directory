import { createSupabaseServerClient } from "../../../lib/supabase/supabase-server";
import { enforceApiGuard, withCacheHeaders } from "../../../lib/api-guard";

const SOCIAL_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "github.com",
  "www.github.com",
  "instagram.com",
  "www.instagram.com",
  "reddit.com",
  "www.reddit.com",
  "linkedin.com",
  "www.linkedin.com",
  "discord.com",
  "www.discord.com",
  "discordapp.com",
  "www.discordapp.com",
  "discord.gg",
  "www.discord.gg",
  "tiktok.com",
  "www.tiktok.com",
  "bsky.app",
  "mastodon.social",
  "snapchat.com",
  "www.snapchat.com",
  "t.me",
  "www.t.me",
  "telegram.me",
  "www.telegram.me",
]);

const jsonResponse = (body, status = 200, cacheSeconds = 0) =>
  new Response(JSON.stringify(body), {
    status,
    headers: withCacheHeaders({ "Content-Type": "application/json" }, cacheSeconds),
  });

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const parseCursor = (raw) => {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(String(raw), "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.name !== "string") return null;
    if (parsed.id === undefined || parsed.id === null) return null;
    return {
      name: parsed.name,
      id: Number(parsed.id),
      score: parsed.score === undefined ? null : Number(parsed.score),
    };
  } catch {
    return null;
  }
};

const encodeCursor = (name, id, score = null) =>
  Buffer.from(
    JSON.stringify(score === null ? { name, id } : { name, id, score }),
    "utf8"
  ).toString("base64url");

const compareProfiles = (a, b) => {
  const nameA = String(a.name || "").toLowerCase();
  const nameB = String(b.name || "").toLowerCase();
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return Number(a.id) - Number(b.id);
};

const parseHost = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const normalizeSearch = (s = "") =>
  s
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?[^/]+\/?/, "")
    .trim();

const extractSocialHandle = (host, pathname) => {
  const raw = (pathname || "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (!raw.length) return null;

  const [first, second] = raw;
  const lower = (v) => String(v || "").toLowerCase();
  const hostKey = lower(host);

  if (hostKey.includes("linkedin.com")) {
    if (["in", "company", "school"].includes(lower(first))) return second || null;
  }
  if (hostKey.includes("reddit.com")) {
    if (["u", "user"].includes(lower(first))) return second || null;
  }
  if (hostKey.includes("tiktok.com")) {
    return (first || "").replace(/^@/, "") || null;
  }
  if (hostKey.includes("bsky.app")) {
    if (lower(first) === "profile") return second || null;
  }
  if (hostKey.includes("mastodon.social")) {
    return (first || "").replace(/^@/, "") || null;
  }
  if (hostKey.includes("snapchat.com")) {
    if (lower(first) === "add") return second || null;
  }
  if (hostKey.includes("discord.com") || hostKey.includes("discordapp.com")) {
    if (["users", "invite"].includes(lower(first))) return second || null;
  }

  return first ? first.replace(/^@/, "") : null;
};

const extractDomainToken = (url) => {
  const host = parseHost(url);
  if (!host) return null;
  return host.replace(/^www\./, "");
};

const linkTokensFromUrl = (link) => {
  const tokens = [];
  if (link.label) tokens.push(String(link.label).toLowerCase());

  if (!link.url) return tokens;

  let host = null;
  let pathname = null;
  try {
    const parsed = new URL(link.url);
    host = parsed.hostname.toLowerCase();
    pathname = parsed.pathname || "";
  } catch {
    return tokens;
  }

  if (SOCIAL_HOSTS.has(host)) {
    const handle = extractSocialHandle(host, pathname);
    if (handle) tokens.push(String(handle).toLowerCase());
    return tokens;
  }

  const domainToken = extractDomainToken(link.url);
  if (domainToken) tokens.push(domainToken.toLowerCase());
  return tokens;
};

const scoreProfile = (profile, q) => {
  const name = String(profile.name || "").toLowerCase();
  const nameStarts = name.startsWith(q);
  const nameIncludes = name.includes(q);
  const linkTokens = profile._link_tokens || [];
  const linkStarts = linkTokens.some((token) => token.startsWith(q));
  const linkIncludes = linkTokens.some((token) => token.includes(q));

  if (nameStarts) return 0;
  if (linkStarts) return 1;
  if (nameIncludes) return 2;
  if (linkIncludes) return 3;
  return 4;
};

const compareByScore = (a, b) => {
  if (a._score !== b._score) return a._score - b._score;
  return compareProfiles(a, b);
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export async function GET(request) {
  const guard = await enforceApiGuard(request, { cacheSeconds: 30 });
  if (guard instanceof Response) return guard;
  const { searchParams } = new URL(request.url);

  const rawQuery = searchParams.get("q");
  const q = rawQuery ? normalizeSearch(rawQuery) : "";
  const limit = clamp(Number(searchParams.get("limit") || 25), 1, 100);
  const cursor = parseCursor(searchParams.get("cursor"));
  const verifiedOnly = String(searchParams.get("verified_only") || "")
    .toLowerCase() === "true";

  const supabase = createSupabaseServerClient();

  const profileFields =
    "id,name,display_name,profile_image_url,bio,nearest_city_name,address,address_verified,last_verified_at";

  // If no query is provided, use direct pagination on zcasher.
  if (!q) {
    let query = supabase
      .from("zcasher")
      .select(profileFields)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);

    if (cursor) {
      const cursorName = cursor.name.replace(/,/g, "\\,");
      query = query.or(
        `name.gt.${cursorName},and(name.eq.${cursorName},id.gt.${cursor.id})`
      );
    }

    const { data: profiles, error } = await query;
    if (error) {
      return jsonResponse({ error: "profile_lookup_failed" }, 500);
    }

    const ids = (profiles || []).map((p) => p.id);
    const { data: links, error: linksError } = await supabase
      .from("zcasher_links")
      .select("id,label,url,is_verified,zcasher_id")
      .in("zcasher_id", ids);

    if (linksError) {
      return jsonResponse({ error: "links_lookup_failed" }, 500);
    }

    const linksById = new Map();
    (links || []).forEach((link) => {
      const key = String(link.zcasher_id);
      if (!linksById.has(key)) linksById.set(key, []);
      linksById.get(key).push({
        id: link.id,
        label: link.label,
        url: link.url,
        is_verified: !!link.is_verified,
      });
    });

    let resultsWithId = (profiles || []).map((profile) => {
      const list = linksById.get(String(profile.id)) || [];
      return {
        id: profile.id,
        username: profile.name,
        display_name: profile.display_name,
        profile_image_url: profile.profile_image_url,
        bio: profile.bio,
        nearest_city_name: profile.nearest_city_name,
        address: profile.address,
        address_verified: !!profile.address_verified,
        verified_at: profile.last_verified_at,
        authenticated_links: list.filter((l) => l.is_verified),
        unauthenticated_links: list.filter((l) => !l.is_verified),
      };
    });

    if (verifiedOnly) {
      resultsWithId = resultsWithId.filter(
        (r) =>
          r.address_verified ||
          (r.authenticated_links && r.authenticated_links.length > 0)
      );
    }

    const last = resultsWithId[resultsWithId.length - 1];
    const next_cursor =
      last && resultsWithId.length === limit
        ? encodeCursor(last.username, last.id)
        : null;

    const results = resultsWithId.map(({ id: _id, ...rest }) => rest);
    return jsonResponse({ results, next_cursor }, 200, guard.cacheSeconds);
  }

  // Query-based search
  const namePromise = supabase
    .from("zcasher")
    .select(profileFields)
    .ilike("name", `%${q}%`)
    .limit(500);

  const labelPromise = supabase
    .from("zcasher_links")
    .select("id,zcasher_id,label,url,is_verified")
    .ilike("label", `%${q}%`)
    .limit(1000);

  const urlPromise = supabase
    .from("zcasher_links")
    .select("id,zcasher_id,label,url,is_verified")
    .ilike("url", `%${q}%`)
    .limit(1000);

  const [
    { data: nameMatches, error: nameError },
    { data: labelMatches, error: labelError },
    { data: urlMatches, error: urlError },
  ] = await Promise.all([namePromise, labelPromise, urlPromise]);

  if (nameError || labelError || urlError) {
    return jsonResponse({ error: "search_failed" }, 500);
  }

  const idSet = new Set((nameMatches || []).map((p) => p.id));

  const linksFromLabel = labelMatches || [];
  const linksFromUrl = urlMatches || [];

  const linkSearchMatches = [...linksFromLabel, ...linksFromUrl].filter((link) => {
    const tokens = linkTokensFromUrl(link);
    return tokens.some((token) => token.includes(q));
  });

  linkSearchMatches.forEach((link) => {
    if (link.zcasher_id) idSet.add(link.zcasher_id);
  });

  const ids = Array.from(idSet);
  if (!ids.length) {
    return jsonResponse({ results: [], next_cursor: null }, 200, guard.cacheSeconds);
  }

  const profileChunks = chunk(ids, 200);
  let profiles = [];
  for (const group of profileChunks) {
    const { data, error } = await supabase
      .from("zcasher")
      .select(profileFields)
      .in("id", group);
    if (error) {
      return jsonResponse({ error: "profile_lookup_failed" }, 500);
    }
    profiles = profiles.concat(data || []);
  }

  const linkChunks = chunk(ids, 200);
  let allLinks = [];
  for (const group of linkChunks) {
    const { data, error } = await supabase
      .from("zcasher_links")
      .select("id,label,url,is_verified,zcasher_id")
      .in("zcasher_id", group);
    if (error) {
      return jsonResponse({ error: "links_lookup_failed" }, 500);
    }
    allLinks = allLinks.concat(data || []);
  }

  const linksById = new Map();
  allLinks.forEach((link) => {
    const key = String(link.zcasher_id);
    if (!linksById.has(key)) linksById.set(key, []);
    linksById.get(key).push({
      id: link.id,
      label: link.label,
      url: link.url,
      is_verified: !!link.is_verified,
    });
  });

  let resultsWithId = profiles
    .slice()
    .map((profile) => {
      const list = linksById.get(String(profile.id)) || [];
      const linkTokens = list.flatMap((link) => linkTokensFromUrl(link));
      return {
        id: profile.id,
        username: profile.name,
        display_name: profile.display_name,
        profile_image_url: profile.profile_image_url,
        bio: profile.bio,
        nearest_city_name: profile.nearest_city_name,
        address: profile.address,
        address_verified: !!profile.address_verified,
        verified_at: profile.last_verified_at,
        authenticated_links: list.filter((l) => l.is_verified),
        unauthenticated_links: list.filter((l) => !l.is_verified),
        _link_tokens: linkTokens,
      };
    });

  resultsWithId = resultsWithId
    .map((profile) => ({
      ...profile,
      _score: scoreProfile(profile, q),
    }))
    .filter((profile) => profile._score < 4)
    .sort(compareByScore);

  if (verifiedOnly) {
    resultsWithId = resultsWithId.filter(
      (r) => r.address_verified || r.authenticated_links.length > 0
    );
  }

  if (cursor) {
    const cursorScore =
      cursor.score === null || Number.isNaN(cursor.score) ? 0 : cursor.score;
    resultsWithId = resultsWithId.filter((r) => {
      if (r._score > cursorScore) return true;
      if (r._score < cursorScore) return false;
      const nameA = r.username.toLowerCase();
      const nameB = cursor.name.toLowerCase();
      if (nameA > nameB) return true;
      if (nameA < nameB) return false;
      return Number(r.id) > Number(cursor.id);
    });
  }

  const pageWithId = resultsWithId.slice(0, limit);
  const last = pageWithId[pageWithId.length - 1];
  const next_cursor =
    last && resultsWithId.length > limit
      ? encodeCursor(last.username, last.id, last._score)
      : null;

  const page = pageWithId.map(({ id: _id, _score, _link_tokens, ...rest }) => rest);
  return jsonResponse({ results: page, next_cursor }, 200, guard.cacheSeconds);
}
