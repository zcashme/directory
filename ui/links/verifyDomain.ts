"use server";

// ui/links/verifyDomain.ts
// Server action: verify ownership of a custom domain link via HTML <link rel="me">
//
// Flow:
//   1. Look up the existing zcasher_links row by (zcasher_id, url).
//   2. Gate on profile.address_verified.
//   3. SSRF-safe fetch of https://<host>/.
//   4. Parse for <link rel="me" href="..."> and require at least one href that
//      matches https://<base-domain>/<slug>.
//   5. Update the row in place: is_verified=true, platform="Domain".

import { promises as dns } from "node:dns";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { buildSlug } from "@/lib/profile/profileUtils";
import { normalizeDomainUrl } from "@/ui/links/providers";
import type { VerifyDomainError } from "@/ui/links/verifyDomainTypes";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "zcash.me";
const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

export async function verifyDomainLink(
  profileId: number,
  url: string,
): Promise<{ ok: boolean; error?: VerifyDomainError; details?: string }> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "internal-error", details: "Supabase client not available" };

  // 1. Find the existing link row.
  const { data: link, error: linkError } = await supabase
    .from("zcasher_links")
    .select("id, url, is_verified")
    .eq("zcasher_id", profileId)
    .eq("url", url)
    .maybeSingle();

  if (linkError) return { ok: false, error: "internal-error", details: linkError.message };
  if (!link) return { ok: false, error: "link-not-found" };
  if (link.is_verified) return { ok: false, error: "already-verified" };

  // 2. Gate on address verification + capture slug.
  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("id, name, slug, address_verified")
    .eq("id", profileId)
    .single();

  if (profileError) return { ok: false, error: "internal-error", details: profileError.message };
  if (!profile?.address_verified) return { ok: false, error: "address-not-verified" };

  const slug = buildSlug(profile);
  if (!slug) return { ok: false, error: "internal-error", details: "Could not build profile slug" };

  // 3. Validate URL and resolve host. The stored URL may be a bare hostname
  // (e.g. "ZcashNames.com") for "Other (custom URL)" links — normalize it.
  const normalized = normalizeDomainUrl(link.url);
  if (!normalized) return { ok: false, error: "invalid-domain" };
  const host = new URL(normalized).hostname.toLowerCase();
  if (!isPublicHostname(host)) return { ok: false, error: "invalid-domain" };

  try {
    const addresses = await dns.lookup(host, { all: true });
    if (addresses.length === 0) return { ok: false, error: "private-host-blocked" };
    for (const a of addresses) {
      if (isPrivateAddress(a.address)) return { ok: false, error: "private-host-blocked" };
    }
  } catch {
    return { ok: false, error: "fetch-failed", details: "DNS resolution failed" };
  }

  // 4. Fetch the homepage (manual redirects + SSRF check on each hop + body cap).
  let html: string;
  try {
    html = await fetchHomepage(`https://${host}/`);
  } catch (err) {
    const code = (err as { code?: VerifyDomainError })?.code;
    if (code === "timeout" || code === "private-host-blocked" || code === "fetch-failed") {
      return { ok: false, error: code };
    }
    return { ok: false, error: "fetch-failed", details: (err as Error).message };
  }

  // 5. Extract rel="me" hrefs.
  const hrefs = extractRelMeHrefs(html);
  if (hrefs.length === 0) return { ok: false, error: "no-rel-me-tag" };

  const expected = `https://${BASE_DOMAIN}/${slug}`;
  const matched = hrefs.some((h) => urlsEqual(h, expected));
  if (!matched) return { ok: false, error: "rel-me-mismatch" };

  // 6. Update the row in place.
  const { error: updateError } = await supabase
    .from("zcasher_links")
    .update({
      is_verified: true,
      platform: "Domain",
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id);

  if (updateError) return { ok: false, error: "internal-error", details: updateError.message };

  return { ok: true };
}

// --- helpers ----------------------------------------------------------------

function isPublicHostname(host: string): boolean {
  if (!host || !host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (/^[0-9.]+$/.test(host)) return false; // raw IPv4 literal
  if (host.startsWith("[") || host.includes(":")) return false; // IPv6 literal
  return true;
}

function isPrivateAddress(addr: string): boolean {
  // IPv6
  if (addr.includes(":")) {
    const lower = addr.toLowerCase();
    if (lower === "::1") return true;
    if (lower === "::") return true;
    if (lower.startsWith("fe80:")) return true; // link-local
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // ULA fc00::/7
    // IPv4-mapped: ::ffff:a.b.c.d
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  // IPv4
  const parts = addr.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

async function fetchHomepage(initialUrl: string): Promise<string> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "zcashme-verifier/1.0 (+https://zcash.me)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") {
        const e = new Error("timeout") as Error & { code: VerifyDomainError };
        e.code = "timeout";
        throw e;
      }
      const e = new Error("fetch failed") as Error & { code: VerifyDomainError };
      e.code = "fetch-failed";
      throw e;
    }
    clearTimeout(timer);

    // Manual redirect handling.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) {
        const e = new Error("redirect without location") as Error & { code: VerifyDomainError };
        e.code = "fetch-failed";
        throw e;
      }
      const next = new URL(loc, currentUrl);
      if (next.protocol !== "https:" && next.protocol !== "http:") {
        const e = new Error("bad redirect scheme") as Error & { code: VerifyDomainError };
        e.code = "fetch-failed";
        throw e;
      }
      const nextHost = next.hostname.toLowerCase();
      if (!isPublicHostname(nextHost)) {
        const e = new Error("private redirect host") as Error & { code: VerifyDomainError };
        e.code = "private-host-blocked";
        throw e;
      }
      try {
        const addrs = await dns.lookup(nextHost, { all: true });
        for (const a of addrs) {
          if (isPrivateAddress(a.address)) {
            const e = new Error("private redirect host") as Error & { code: VerifyDomainError };
            e.code = "private-host-blocked";
            throw e;
          }
        }
      } catch {
        const e = new Error("redirect dns failed") as Error & { code: VerifyDomainError };
        e.code = "fetch-failed";
        throw e;
      }
      currentUrl = next.toString();
      continue;
    }

    if (!res.ok) {
      const e = new Error(`http ${res.status}`) as Error & { code: VerifyDomainError };
      e.code = "fetch-failed";
      throw e;
    }

    return await readBodyCapped(res);
  }
  const e = new Error("too many redirects") as Error & { code: VerifyDomainError };
  e.code = "fetch-failed";
  throw e;
}

async function readBodyCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      // Keep what we have and stop reading.
      const remaining = MAX_BODY_BYTES - (total - value.byteLength);
      if (remaining > 0) chunks.push(value.subarray(0, remaining));
      try {
        await reader.cancel();
      } catch {}
      break;
    }
    chunks.push(value);
  }
  // Concatenate and decode as UTF-8 (best-effort).
  const merged = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function extractRelMeHrefs(html: string): string[] {
  const out: string[] = [];
  // Only scan <head> if present, to avoid false positives in body content.
  const headEnd = html.search(/<\/head\s*>/i);
  const scope = headEnd > 0 ? html.slice(0, headEnd) : html;

  // Match <link ...> tags and check for both rel=me and href.
  const linkTagRe = /<link\b[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkTagRe.exec(scope)) !== null) {
    const tag = m[0];
    const relMatch = tag.match(/\brel\s*=\s*["']?([^"'>\s]+)["']?/i);
    if (!relMatch) continue;
    const relValues = relMatch[1].toLowerCase().split(/\s+/);
    if (!relValues.includes("me")) continue;
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    out.push(hrefMatch[1]);
  }
  return out;
}

function urlsEqual(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    if (ua.protocol !== ub.protocol) return false;
    if (ua.hostname.toLowerCase() !== ub.hostname.toLowerCase()) return false;
    const pa = (ua.pathname || "/").replace(/\/+$/, "") || "/";
    const pb = (ub.pathname || "/").replace(/\/+$/, "") || "/";
    return pa.toLowerCase() === pb.toLowerCase();
  } catch {
    return false;
  }
}
