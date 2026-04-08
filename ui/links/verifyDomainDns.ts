"use server";

// ui/links/verifyDomainDns.ts
// DNS-based alternative to the rel="me" verifier in verifyDomain.ts.
//
// Flow:
//   1. getDomainDnsInstructions(profileId, url) → { name, value }
//      Returns the TXT record the user must publish on their domain.
//      Token is HMAC-derived from (profileId, domain) — no DB storage.
//   2. verifyDomainDns(profileId, url) → { ok, error }
//      Looks up _zcashme.<host> TXT records and matches against the expected
//      "verify=<token>". On success, updates the existing zcasher_links row
//      exactly like verifyDomain.ts (is_verified=true, platform="Domain").

import { Resolver } from "node:dns/promises";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { normalizeDomainUrl } from "@/ui/links/providers";
import { deriveDomainToken } from "@/lib/verification/domainToken";
import type { VerifyDomainError, DomainDnsInstructions } from "@/ui/links/verifyDomainTypes";

const DNS_TIMEOUT_MS = 5000;
const DNS_RETRIES = 2;
const RECORD_PREFIX = "_zcashme.";
const VALUE_PREFIX = "verify=";

export async function getDomainDnsInstructions(
  profileId: number,
  url: string,
): Promise<{ ok: boolean; error?: VerifyDomainError; instructions?: DomainDnsInstructions }> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "internal-error" };

  // Confirm the link row exists and isn't already verified.
  const { data: link, error: linkError } = await supabase
    .from("zcasher_links")
    .select("id, url, is_verified")
    .eq("zcasher_id", profileId)
    .eq("url", url)
    .maybeSingle();
  if (linkError) return { ok: false, error: "internal-error" };
  if (!link) return { ok: false, error: "link-not-found" };
  if (link.is_verified) return { ok: false, error: "already-verified" };

  // Gate on address verification.
  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("address_verified")
    .eq("id", profileId)
    .single();
  if (profileError) return { ok: false, error: "internal-error" };
  if (!profile?.address_verified) return { ok: false, error: "address-not-verified" };

  const normalized = normalizeDomainUrl(link.url);
  if (!normalized) return { ok: false, error: "invalid-domain" };
  const host = new URL(normalized).hostname.toLowerCase();

  const token = await deriveDomainToken(profileId, host);
  return {
    ok: true,
    instructions: {
      name: `${RECORD_PREFIX}${host}`,
      value: `${VALUE_PREFIX}${token}`,
    },
  };
}

export async function verifyDomainDns(
  profileId: number,
  url: string,
): Promise<{ ok: boolean; error?: VerifyDomainError; details?: string }> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "internal-error" };

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

  // 2. Gate on address verification.
  const { data: profile, error: profileError } = await supabase
    .from("zcasher")
    .select("address_verified")
    .eq("id", profileId)
    .single();
  if (profileError) return { ok: false, error: "internal-error", details: profileError.message };
  if (!profile?.address_verified) return { ok: false, error: "address-not-verified" };

  // 3. Normalize host.
  const normalized = normalizeDomainUrl(link.url);
  if (!normalized) return { ok: false, error: "invalid-domain" };
  const host = new URL(normalized).hostname.toLowerCase();

  // 4. Derive expected token.
  const expectedToken = await deriveDomainToken(profileId, host);
  const expectedValue = `${VALUE_PREFIX}${expectedToken}`;
  const recordName = `${RECORD_PREFIX}${host}`;

  // 5. Query TXT records with timeout + retry.
  let txtRecords: string[][] | null = null;
  for (let attempt = 0; attempt <= DNS_RETRIES; attempt++) {
    try {
      txtRecords = await resolveTxtWithTimeout(recordName, DNS_TIMEOUT_MS);
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      // ENOTFOUND / ENODATA: record genuinely doesn't exist — don't retry.
      if (code === "ENOTFOUND" || code === "ENODATA") {
        return { ok: false, error: "no-txt-record" };
      }
      if (attempt === DNS_RETRIES) {
        return { ok: false, error: "dns-lookup-failed", details: (err as Error).message };
      }
    }
  }

  if (!txtRecords || txtRecords.length === 0) {
    return { ok: false, error: "no-txt-record" };
  }

  // Each TXT record is an array of string chunks (TXT records can be split into
  // 255-char strings); join them before comparing.
  const flat = txtRecords.map((chunks) => chunks.join("").trim());
  const matched = flat.some((record) => record === expectedValue);
  if (!matched) return { ok: false, error: "txt-mismatch" };

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

async function resolveTxtWithTimeout(name: string, timeoutMs: number): Promise<string[][]> {
  const resolver = new Resolver();
  return await Promise.race([
    resolver.resolveTxt(name),
    new Promise<string[][]>((_, reject) =>
      setTimeout(() => {
        try {
          resolver.cancel();
        } catch {}
        const err = new Error("DNS query timed out") as NodeJS.ErrnoException;
        err.code = "ETIMEOUT";
        reject(err);
      }, timeoutMs),
    ),
  ]);
}
