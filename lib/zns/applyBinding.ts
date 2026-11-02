import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import {
  classifyZnsMatch,
  classifyZnsRelease,
  shouldApplyAddress,
  type MatchCandidate,
  type MatchDecision,
  type MatchRegistration,
  type UnboundDecision,
} from "@/lib/zns/match";
import { allocateSuffixSlug } from "@/lib/zns/slugs";
import { isValidZnsName, normalizeZnsName, znsNamesMatch } from "@/lib/zns/name";
import type { ZnsLastAction, ZnsRegistration } from "@/lib/zns/client";

export interface ApplyZnsResult {
  boundId: number | null;
  displacedId: number | null;
  created: boolean;
  deactivated: boolean;
}

const CANDIDATE_FIELDS = [
  "id",
  "name",
  "address",
  "address_verified",
  "slug",
  "zns_name",
  "zns_active",
  "zns_claim_txid",
  "zns_address_height",
  "is_maxi",
  "maxi_source",
].join(",");

function asBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "y" || normalized === "t";
  }
  return false;
}

function asMaxiSource(value: unknown): "paid" | "zns" | null {
  return value === "paid" || value === "zns" ? value : null;
}

function toCandidate(row: Record<string, unknown>): MatchCandidate {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    address: typeof row.address === "string" ? row.address : null,
    address_verified: asBoolean(row.address_verified),
    slug: typeof row.slug === "string" ? row.slug : null,
    zns_name: typeof row.zns_name === "string" ? row.zns_name : null,
    zns_active: asBoolean(row.zns_active),
    zns_claim_txid: typeof row.zns_claim_txid === "string" ? row.zns_claim_txid : null,
    zns_address_height: typeof row.zns_address_height === "number" ? row.zns_address_height : null,
    is_maxi: asBoolean(row.is_maxi),
    maxi_source: asMaxiSource(row.maxi_source),
  };
}

function bindingPatch(
  registration: MatchRegistration,
  existing: { zns_claim_txid?: string | null; zns_bound_height?: number | null } = {}
) {
  const keepClaim = registration.lastAction === "update" && existing.zns_claim_txid;
  return {
    name: registration.name,
    zns_name: registration.name,
    zns_active: true,
    zns_claim_txid: keepClaim ? existing.zns_claim_txid : registration.txid,
    zns_bound_height: keepClaim ? existing.zns_bound_height ?? registration.height : registration.height,
    zns_last_action: registration.lastAction,
    zns_expires_at: registration.expiresAt,
    zns_address_height: registration.height,
    address: registration.address,
    slug: registration.name,
  };
}

function toMatchRegistration(registration: ZnsRegistration): MatchRegistration {
  return {
    name: normalizeZnsName(registration.name),
    address: registration.address,
    txid: registration.txid,
    height: registration.height,
    lastAction: registration.lastAction,
    expiresAt: registration.expiresAt,
  };
}

function orQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function loadCandidates(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  name: string
): Promise<MatchCandidate[]> {
  const results = await Promise.all([
    supabase.from("zcasher").select(CANDIDATE_FIELDS).ilike("name", name).limit(100),
    supabase.from("zcasher").select(CANDIDATE_FIELDS).eq("zns_name", name).limit(100),
    supabase.from("zcasher").select(CANDIDATE_FIELDS).eq("slug", name).limit(100),
  ]);

  const byId = new Map<number, MatchCandidate>();
  for (const result of results) {
    for (const row of result.data ?? []) {
      const candidate = toCandidate(row as unknown as Record<string, unknown>);
      if (!candidate.id) continue;
      if (
        znsNamesMatch(candidate.name, name)
        || (candidate.zns_name && znsNamesMatch(candidate.zns_name, name))
        || candidate.slug === name
      ) {
        byId.set(candidate.id, candidate);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

async function loadTakenSlugs(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  name: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("zcasher")
    .select("slug")
    .or(`slug.eq.${orQuote(name)},slug.like.${orQuote(`${name}-%`)}`)
    .limit(500);
  return new Set(
    (data ?? [])
      .map((row) => (typeof row.slug === "string" ? row.slug : ""))
      .filter(Boolean)
  );
}

async function reserveNamespace(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  registration: MatchRegistration
): Promise<void> {
  await supabase.from("zns_namespace").upsert({
    name: registration.name,
    first_claim_txid: registration.txid,
    first_claim_height: registration.height,
  }, { onConflict: "name", ignoreDuplicates: true });
}

async function displaceProfile(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profile: MatchCandidate,
  name: string,
  taken: Set<string>
): Promise<string> {
  const nextSlug = allocateSuffixSlug(name, profile.id, taken, profile.slug);
  const patch: Record<string, unknown> = {
    slug: nextSlug,
    zns_active: false,
  };
  if (profile.zns_name && znsNamesMatch(profile.zns_name, name)) {
    patch.zns_active = false;
  }
  const { error } = await supabase.from("zcasher").update(patch).eq("id", profile.id);
  if (error) throw new Error(error.message || "Failed to displace profile slug");
  taken.add(nextSlug);
  taken.delete(name);
  return nextSlug;
}

async function bindExisting(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profile: MatchCandidate,
  registration: MatchRegistration,
  options: { syncAddressOnly?: boolean } = {}
): Promise<void> {
  const patch: Record<string, unknown> = options.syncAddressOnly
    ? {
        zns_active: true,
        zns_last_action: registration.lastAction,
        zns_expires_at: registration.expiresAt,
      }
    : bindingPatch(registration, profile);

  if (shouldApplyAddress(profile.zns_address_height, registration.height)) {
    patch.address = registration.address;
    patch.zns_address_height = registration.height;
  } else {
    delete patch.address;
    if (!options.syncAddressOnly) {
      patch.zns_address_height = profile.zns_address_height;
    }
  }

  const { error } = await supabase.from("zcasher").update(patch).eq("id", profile.id);
  if (error) throw new Error(error.message || "Failed to bind ZNS profile");
}

async function createBoundProfile(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  registration: MatchRegistration
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("zcasher")
    .insert({
      address_verified: false,
      created_at: now,
      ...bindingPatch(registration),
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(error?.message || "Failed to create ZNS-backed profile");
  }
  return Number(data.id);
}

async function applyUnbound(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  decision: UnboundDecision,
  registration: MatchRegistration,
  candidates: MatchCandidate[],
  taken: Set<string>
): Promise<ApplyZnsResult> {
  if (decision.kind === "upgrade") {
    const profile = candidates.find((candidate) => candidate.id === decision.profileId);
    if (!profile) throw new Error("Upgrade target missing");
    await bindExisting(supabase, profile, registration);
    return { boundId: profile.id, displacedId: null, created: false, deactivated: false };
  }

  if (decision.kind === "create") {
    const boundId = await createBoundProfile(supabase, registration);
    return { boundId, displacedId: null, created: true, deactivated: false };
  }

  if (decision.kind === "displace_and_upgrade") {
    const displace = candidates.find((candidate) => candidate.id === decision.displaceId);
    const profile = candidates.find((candidate) => candidate.id === decision.profileId);
    if (!displace) throw new Error("Displace target missing");
    if (!profile) throw new Error("Upgrade target missing");
    await displaceProfile(supabase, displace, registration.name, taken);
    await bindExisting(supabase, profile, registration);
    return { boundId: profile.id, displacedId: displace.id, created: false, deactivated: false };
  }

  const displace = candidates.find((candidate) => candidate.id === decision.displaceId);
  if (!displace) throw new Error("Displace target missing");
  await displaceProfile(supabase, displace, registration.name, taken);
  const boundId = await createBoundProfile(supabase, registration);
  return { boundId, displacedId: displace.id, created: true, deactivated: false };
}

function applyDecision(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  decision: MatchDecision,
  registration: MatchRegistration,
  candidates: MatchCandidate[],
  taken: Set<string>
): Promise<ApplyZnsResult> {
  if (decision.kind === "sync") {
    const profile = candidates.find((candidate) => candidate.id === decision.boundId);
    if (!profile) throw new Error("Bound profile missing");
    return bindExisting(supabase, profile, registration, { syncAddressOnly: true }).then(() => ({
      boundId: profile.id,
      displacedId: null,
      created: false,
      deactivated: false,
    }));
  }

  if (decision.kind === "reactivate" || decision.kind === "new_period_same_owner") {
    const profile = candidates.find((candidate) => candidate.id === decision.boundId);
    if (!profile) throw new Error("Bound profile missing");
    return bindExisting(supabase, profile, registration).then(() => ({
      boundId: profile.id,
      displacedId: null,
      created: false,
      deactivated: false,
    }));
  }

  if (decision.kind === "transfer") {
    const previous = candidates.find((candidate) => candidate.id === decision.previousBoundId);
    if (!previous) throw new Error("Previous bound profile missing");
    return displaceProfile(supabase, previous, registration.name, taken).then(() =>
      applyUnbound(supabase, decision.next, registration, candidates, taken)
    ).then((result) => ({ ...result, displacedId: previous.id }));
  }

  return applyUnbound(supabase, decision, registration, candidates, taken);
}

export async function applyZnsRegistration(registration: ZnsRegistration): Promise<ApplyZnsResult> {
  const normalized = toMatchRegistration(registration);
  if (!isValidZnsName(normalized.name) || !normalized.address) {
    return { boundId: null, displacedId: null, created: false, deactivated: false };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  await reserveNamespace(supabase, normalized);
  const candidates = await loadCandidates(supabase, normalized.name);
  const taken = await loadTakenSlugs(supabase, normalized.name);
  const decision = classifyZnsMatch(normalized, candidates);
  return applyDecision(supabase, decision, normalized, candidates, taken);
}

export async function deactivateZnsName(name: string, lastAction: ZnsLastAction = "release"): Promise<ApplyZnsResult> {
  const normalized = normalizeZnsName(name);
  if (!isValidZnsName(normalized)) {
    return { boundId: null, displacedId: null, created: false, deactivated: false };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const candidates = await loadCandidates(supabase, normalized);
  const decision = classifyZnsRelease(normalized, candidates);
  if (decision.kind === "none") {
    return { boundId: null, displacedId: null, created: false, deactivated: false };
  }

  const profile = candidates.find((candidate) => candidate.id === decision.boundId);
  if (!profile) {
    return { boundId: null, displacedId: null, created: false, deactivated: false };
  }

  const patch: Record<string, unknown> = {
    zns_active: false,
    zns_last_action: lastAction,
  };

  const { error } = await supabase.from("zcasher").update(patch).eq("id", profile.id);
  if (error) throw new Error(error.message || "Failed to deactivate ZNS profile");

  return { boundId: profile.id, displacedId: null, created: false, deactivated: true };
}

export async function namespaceContains(name: string): Promise<boolean> {
  const normalized = normalizeZnsName(name);
  if (!isValidZnsName(normalized)) return false;
  const supabase = createSupabaseServerClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("zns_namespace")
    .select("name")
    .eq("name", normalized)
    .maybeSingle();
  return Boolean(data?.name);
}
