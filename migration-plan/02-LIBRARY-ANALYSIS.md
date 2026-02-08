# Library & Server Actions Analysis: TypeScript Migration

**File Count**: 23 utility files + 13 server actions in `/lib/` directory
**Estimated Conversion Time**: 28-40 hours (18-25 hours utilities + 10-15 hours actions)
**Parallel Work**: Yes (organize by dependency)
**Complexity**: Medium-High (async patterns, external APIs, complex data transforms)

---

## Table of Contents

1. [Server Actions Overview](#server-actions-overview)
2. [Utility Files by Category](#utility-files-by-category)
3. [Return Type Patterns](#return-type-patterns)
4. [Complex Async Patterns](#complex-async-patterns)
5. [Detailed Server Actions](#detailed-server-actions)
6. [Detailed Utilities](#detailed-utilities)
7. [Migration Checklist](#migration-checklist)

---

## Server Actions Overview

### All 13 Server Actions (alphabetical)

1. **confirmOtpAction.ts** - OTP confirmation
2. **createProfileAction.ts** - Profile creation (5 exported functions)
3. **depositAction.ts** - Swap deposit submission
4. **fetchTokens.ts** - Token caching
5. **getNsProfilesAction.ts** - Directory with rankings (COMPLEX)
6. **getProfileLinksAction.ts** - Fetch links for single profile
7. **getProfileLinksBatchAction.ts** - Fetch links for multiple profiles
8. **getRateAction.ts** - Exchange rates (provider fallback)
9. **quoteAction.ts** - Swap quote (4-stage async chain, COMPLEX)
10. **confirmAction.ts** - Swap confirmation (similar to quote)
11. **searchCitiesAction.ts** - City search
12. **searchProfilesAction.ts** - Profile search (2 functions)
13. **updateLinkVerificationAction.ts** - Link verification update

---

## Utility Files by Category

### Category 1: No Dependencies (4 files)
- swapPayload.ts
- addressValidation.ts
- tokenUtils.ts
- validateUrl.ts

### Category 2: Supabase-Dependent (7 files)
- supabase-server.ts
- searchCities.ts
- searchProfiles.ts
- profileQueries.ts
- verifyLinkDb.ts
- createProfile.ts
- confirmOtp.ts

### Category 3: Pure Transform Functions (4 files)
- profileLinks.ts
- profileUtils.ts
- usernameNormalizer.ts
- zcashUtils.ts

### Category 4: External API Integration (2 files)
- oneClick.ts (TOKEN FETCHING, QUOTE REQUESTS - COMPLEX)
- profileFetcher.ts (MULTI-STAGE LOOKUP - COMPLEX)

### Category 5: Additional Utilities (2 files)
- fetchTokens.ts (caching wrapper)
- getRateAction.ts (provider fallback)

---

## Return Type Patterns

### Standard Server Action Response Pattern

All server actions return one of these patterns:

#### Pattern 1: Simple Result
```typescript
type ServerActionResponse<T> = {
  ok: boolean;
  error?: string;
  data?: T;
};

// Usage
const result = await getProfileLinksAction(zcasherId);
if (result.ok) {
  console.log(result.data); // Link[]
} else {
  console.log(result.error); // string
}
```

#### Pattern 2: With Retryable Flag (Swap operations)
```typescript
type SwapResponse<T> = {
  ok: boolean;
  error?: string;
  data?: T;
  retryable?: boolean; // Indicates if user should retry
};

// Usage
const result = await quoteAction(params);
if (!result.ok && result.retryable) {
  // Show "Try again" button
} else if (!result.ok) {
  // Show error, no retry available
}
```

#### Pattern 3: Discriminated Union (Type-Safe)
```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; retryable?: boolean };

// Exhaustive pattern matching
const result = await quoteAction(params);
if (result.ok) {
  // result.data available, no error possible
  useQuote(result.data);
} else {
  // result.error available, no data
  showError(result.error);
}
```

### Specific Response Types

#### Profile Operations
```typescript
type Profile = { id: string; name: string; ... };
type Link = { id: string; url: string; is_verified: boolean };

// getProfileLinksAction returns
Promise<{ ok: boolean; data?: Link[] }>

// getProfileLinksBatchAction returns
Promise<{ ok: boolean; data?: Record<string, Link[]> }>
```

#### Search Operations
```typescript
// searchProfilesAction returns
Promise<{ ok: boolean; data?: Profile[] }>

// searchCitiesAction returns
Promise<{ ok: boolean; data?: City[] }>

// checkUsernameExists returns
Promise<{ ok: boolean; exists?: boolean }>
```

#### Swap Operations (Most Complex)
```typescript
type QuoteResponse = {
  ok: boolean;
  error?: string;
  retryable?: boolean;
  quoteId?: string | null;
  quote?: {
    amountIn: string;
    amountOut: string;
    amountInFormatted: string;
    amountOutFormatted: string;
    amountInUsd?: number;
    amountOutUsd?: number;
    minAmountOut?: number;
    timeEstimate: string;
  };
  display?: { ... };
  requestDebug?: { ... };
};

// quoteAction returns
Promise<QuoteResponse>

// confirmAction returns similar with depositAddress, depositMode, paymentUri
```

#### Directory Operations
```typescript
type ProfileWithRankings = Profile & {
  rank_alltime: number;
  rank_weekly: number;
  rank_monthly: number;
  verified_links_count: number;
  links?: Link[];
};

// getNsProfilesAction returns
Promise<{ ok: boolean; data?: ProfileWithRankings[] }>
```

---

## Complex Async Patterns

### Pattern 1: Promise.all for Parallel Queries

**Used In**: getNsProfilesAction, profileFetcher

```typescript
// Problem: Need rankings from 3 tables in parallel
const [alltime, weekly, monthly] = await Promise.all([
  supabase
    .from("referrer_ranked_alltime")
    .select("referred_by_zcasher_id, rank_alltime")
    .order("rank_alltime", { ascending: true })
    .limit(10),
  supabase
    .from("referrer_ranked_weekly")
    .select("referred_by_zcasher_id, rank_weekly")
    .order("rank_weekly", { ascending: true })
    .limit(10),
  supabase
    .from("referrer_ranked_monthly")
    .select("referred_by_zcasher_id, rank_monthly")
    .order("rank_monthly", { ascending: true })
    .limit(10),
]);

// TypeScript Solution: Type as tuple
type RankingRow = {
  referred_by_zcasher_id: string | number;
  rank_alltime?: number;
  rank_weekly?: number;
  rank_monthly?: number;
};

type RankingResult = {
  data: RankingRow[] | null;
  error: Error | null;
};

// For await Promise.all:
const [alltime, weekly, monthly]: [RankingResult, RankingResult, RankingResult] =
  await Promise.all([...queries]);
```

---

### Pattern 2: Sequential Async Chain (getSwapQuote)

**Used In**: quoteAction, confirmAction

```typescript
// 4-stage pipeline: Load → Build → Validate → Request
async function getSwapQuote(body: SwapQuoteRequest): Promise<QuoteResponse> {
  // Stage 1: Load tokens from cache
  const tokensPayload = await getCachedTokens();
  if (tokensPayload.error) {
    return { ok: false, error: tokensPayload.error, retryable: true };
  }

  // Stage 2: Build payload (sync validation)
  const payload = buildQuotePayload(body, { dry: true, tokensPayload });
  if (payload.error) {
    return { ok: false, error: payload.error, retryable: false };
  }

  // Stage 3: Validate address (sync)
  const validation = validateAddressForBlockchain(body.refundAddress, blockchain);
  if (!validation.valid) {
    return { ok: false, error: validation.error, retryable: false };
  }

  // Stage 4: Fetch quote (async)
  const quote = await oneclickQuote(payload);
  if (quote.error) {
    return { ok: false, error: quote.error, retryable: true };
  }

  return { ok: true, data: formatQuoteResponse(quote) };
}

// TypeScript: Use type narrowing at each stage
```

---

### Pattern 3: Pagination Loop with Accumulation

**Used In**: getNsProfilesAction, profileFetcher

```typescript
async function fetchAllProfiles(pageSize: number = 1000): Promise<Profile[]> {
  let from = 0;
  let allProfiles: Profile[] = [];
  let total = 0;

  while (true) {
    const { data, error, count } = await supabase
      .from("zcasher_searchable")
      .select("*", { count: "exact" })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    allProfiles = [...allProfiles, ...(data || [])];
    total = count ?? total;

    if (!data?.length || allProfiles.length >= total) break;
    from += pageSize;
  }

  return allProfiles;
}

// TypeScript: Specify return type clearly
async function fetchAllProfiles(pageSize?: number): Promise<Profile[]> {
  // Loop implementation
}
```

---

### Pattern 4: Try-Catch with Error Transformation

**Used In**: All server actions

```typescript
export async function getProfileLinksAction(zcasherId: string): Promise<Result<Link[]>> {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return { ok: false, error: "Database unavailable" };
    }

    const { data, error } = await supabase
      .from("zcasher_links")
      .select("*")
      .eq("zcasher_id", zcasherId);

    if (error) {
      return {
        ok: false,
        error: error.message || "Failed to fetch links",
      };
    }

    return { ok: true, data: data || [] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// TypeScript: Use discriminated union for return type
```

---

### Pattern 5: Provider Fallback Loop (getRateAction)

**Used In**: getRateAction

```typescript
type RateProvider = {
  name: string;
  url: string;
  parse: (data: any) => number | null;
};

async function getRateAction(fiat = "USD", asset = "ZEC"): Promise<RateResponse> {
  const providers: RateProvider[] = [
    {
      name: "Coinbase",
      url: `https://api.coinbase.com/v2/exchange-rates?currency=${asset}`,
      parse: (data) => data.rates?.[fiat] ? 1 / data.rates[fiat] : null,
    },
    {
      name: "CoinGecko",
      url: `https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=${fiat.toLowerCase()}`,
      parse: (data) => data.zcash?.[fiat.toLowerCase()],
    },
    // ... more providers
  ];

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url);
      const data = await response.json();
      const rate = provider.parse(data);

      if (rate && rate > 0) {
        return {
          ok: true,
          rate,
          source: provider.name,
          fiat,
          asset,
        };
      }
    } catch (error) {
      // Continue to next provider
    }
  }

  return {
    ok: false,
    error: "All rate providers failed",
  };
}

// TypeScript: Generic provider pattern, discriminated return union
```

---

### Pattern 6: Data Transformation with Type Inference

**Used In**: profileFetcher, oneClick

```typescript
// Problem: API returns flexible shape, need to transform
function extractDepositFields(response: any): {
  depositAddress: string | null;
  depositMode: string | null;
} {
  return {
    depositAddress: response?.deposit?.address || null,
    depositMode: response?.deposit?.mode || null,
  };
}

// TypeScript Solution: Create types from API response
interface ApiDepositResponse {
  deposit?: {
    address?: string;
    mode?: string;
  };
}

function extractDepositFields(response: ApiDepositResponse): {
  depositAddress: string | null;
  depositMode: string | null;
} {
  return {
    depositAddress: response.deposit?.address ?? null,
    depositMode: response.deposit?.mode ?? null,
  };
}
```

---

## Detailed Server Actions

### Group 1: Simple Single-Call Actions (3 hours)

#### confirmOtpAction.ts
```typescript
import type { ServerActionResponse } from "@/lib/types";

export async function confirmOtpAction(
  zcasherId: string,
  otp: string
): Promise<ServerActionResponse<{ status: string }>> {
  try {
    if (!zcasherId || !otp) {
      return { ok: false, error: "Missing required parameters" };
    }

    const result = await confirmOtp(zcasherId, otp);
    if (result.error) {
      return { ok: false, error: result.error.message };
    }

    return {
      ok: true,
      data: result.data || { status: "confirmed" },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Confirmation failed",
    };
  }
}
```

**Complexity**: Low
**Dependencies**: confirmOtp utility
**Time**: 30 minutes

---

#### checkAddressTakenAction.ts, checkUsernameExistsAction.ts, etc.
```typescript
export async function checkAddressTakenAction(
  address: string
): Promise<{ ok: boolean; taken?: boolean }> {
  try {
    const isTaken = await checkAddressTaken(address);
    return { ok: true, taken: isTaken };
  } catch (error) {
    return { ok: false };
  }
}
```

**Complexity**: Low
**Time**: 30 minutes each

---

### Group 2: Batch Operations (2 hours)

#### getProfileLinksBatchAction.ts
```typescript
import type { ServerActionResponse, Link } from "@/lib/types";

export async function getProfileLinksBatchAction(
  zcasherIds: string[]
): Promise<ServerActionResponse<Record<string, Link[]>>> {
  try {
    const { data, error } = await supabase
      .from("zcasher_links")
      .select("zcasher_id, id, label, url, is_verified")
      .in("zcasher_id", zcasherIds);

    if (error) {
      return {
        ok: false,
        error: error.message,
        data: {},
      };
    }

    // Group by zcasher_id
    const grouped: Record<string, Link[]> = {};
    (data || []).forEach((link) => {
      const id = String(link.zcasher_id);
      grouped[id] ??= [];
      grouped[id].push(link);
    });

    return { ok: true, data: grouped };
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
      data: {},
    };
  }
}
```

**Complexity**: Medium (data grouping)
**Time**: 1 hour

---

### Group 3: Complex Multi-Step Actions (6-8 hours)

#### getNsProfilesAction.ts (COMPLEX)
```typescript
import type { ServerActionResponse } from "@/lib/types";

export async function getNsProfilesAction(): Promise<
  ServerActionResponse<ProfileWithRankings[]>
> {
  try {
    // Stage 1: Fetch 3 ranking tables in parallel
    const [{ data: alltime }, { data: weekly }, { data: monthly }] =
      await Promise.all([
        supabase.from("referrer_ranked_alltime").select("referred_by_zcasher_id, rank_alltime"),
        supabase.from("referrer_ranked_weekly").select("referred_by_zcasher_id, rank_weekly"),
        supabase.from("referrer_ranked_monthly").select("referred_by_zcasher_id, rank_monthly"),
      ]);

    // Stage 2: Build lookup maps
    const rankMaps = {
      alltime: new Map(
        (alltime || []).map((r) => [String(r.referred_by_zcasher_id), r.rank_alltime])
      ),
      weekly: new Map(
        (weekly || []).map((r) => [String(r.referred_by_zcasher_id), r.rank_weekly])
      ),
      monthly: new Map(
        (monthly || []).map((r) => [String(r.referred_by_zcasher_id), r.rank_monthly])
      ),
    };

    // Stage 3: Fetch profiles with pagination
    let from = 0;
    const pageSize = 1000;
    let allProfiles: Profile[] = [];
    let total = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from("zcasher_searchable")
        .select("*", { count: "exact" })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      allProfiles = [...allProfiles, ...(data || [])];
      total = count ?? total;

      if (!data?.length || allProfiles.length >= total) break;
      from += pageSize;
    }

    // Stage 4: Enrich profiles with rankings
    const enriched: ProfileWithRankings[] = allProfiles.map((profile) => ({
      ...profile,
      rank_alltime: rankMaps.alltime.get(String(profile.id)) || 0,
      rank_weekly: rankMaps.weekly.get(String(profile.id)) || 0,
      rank_monthly: rankMaps.monthly.get(String(profile.id)) || 0,
    }));

    return { ok: true, data: enriched };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to fetch profiles",
      data: [],
    };
  }
}
```

**Complexity**: High (Promise.all, pagination, enrichment)
**Time**: 2-3 hours

---

#### quoteAction.ts (COMPLEX)
```typescript
import type { ServerActionResponse, QuoteResponse } from "@/lib/types";

export async function quoteAction(body: {
  fromToken: string;
  toToken: string;
  amountIn: string;
  destAddress: string;
  refundAddress: string;
  slippageTolerance?: number;
}): Promise<QuoteResponse> {
  try {
    // Stage 1: Load tokens
    const tokensPayload = await getCachedTokens();
    if (tokensPayload.error) {
      return {
        ok: false,
        error: tokensPayload.error,
        retryable: true,
      };
    }

    // Stage 2: Build payload
    const payload = buildQuotePayload(body, { dry: true, tokensPayload });
    if ("error" in payload) {
      return {
        ok: false,
        error: payload.error,
        retryable: false,
      };
    }

    // Stage 3: Validate refund address
    const originToken = findToken(tokensPayload, payload.originAsset);
    if (originToken) {
      const validation = validateAddressForBlockchain(
        payload.refundTo,
        originToken.blockchain
      );
      if (!validation.valid) {
        return {
          ok: false,
          error: validation.error || "Invalid refund address",
          retryable: false,
        };
      }
    }

    // Stage 4: Get quote
    const quote = await oneclickQuote(payload);
    if (quote.error) {
      return {
        ok: false,
        error: quote.error,
        retryable: true,
      };
    }

    // Format response
    const quoteData = quote.quote || quote;
    return {
      ok: true,
      quoteId: quote.quoteId,
      quote: {
        amountIn: quoteData.amountIn || body.amountIn,
        amountOut: quoteData.amountOut || "0",
        amountInFormatted: quoteData.amountInFormatted || formatAmount(body.amountIn),
        amountOutFormatted: quoteData.amountOutFormatted || "0",
        amountInUsd: quoteData.amountInUsd,
        amountOutUsd: quoteData.amountOutUsd,
        minAmountOut: quoteData.minAmountOut,
        timeEstimate: quoteData.timeEstimate || "~1-3 minutes",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Quote request failed",
      retryable: true,
    };
  }
}
```

**Complexity**: High (4-stage chain, error handling at each stage)
**Time**: 2-3 hours

---

### Group 4: Swap Operations with Caching (3 hours)

#### fetchTokens.ts
```typescript
import { unstable_cache } from "next/cache";
import type { ServerActionResponse, Token } from "@/lib/types";

export const getCachedTokens = unstable_cache(
  async (): Promise<Token[]> => {
    const result = await oneclickTokens();
    if (result.error) {
      throw new Error(result.error);
    }
    return result.tokens || [];
  },
  ["oneclick-tokens"],
  {
    revalidate: 300, // 5 minutes
    tags: ["tokens"],
  }
);

export async function getSwapTokensAction(): Promise<
  ServerActionResponse<Token[]>
> {
  try {
    const tokens = await getCachedTokens();
    return { ok: true, data: tokens };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to fetch tokens",
      data: [],
    };
  }
}
```

**Complexity**: Medium (Next.js caching)
**Time**: 1 hour

---

#### getRateAction.ts
```typescript
import type { RateResponse } from "@/lib/types";

type RateProvider = {
  name: string;
  url: string;
  parse: (data: any) => number | null;
};

export async function getRateAction(
  fiat: string = "USD",
  asset: string = "ZEC"
): Promise<RateResponse> {
  const providers: RateProvider[] = [
    {
      name: "Coinbase",
      url: `https://api.coinbase.com/v2/exchange-rates?currency=${asset}`,
      parse: (data: any) => (data.rates?.[fiat] ? 1 / data.rates[fiat] : null),
    },
    {
      name: "CoinGecko",
      url: `https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=${fiat.toLowerCase()}`,
      parse: (data: any) => data.zcash?.[fiat.toLowerCase()],
    },
    {
      name: "CryptoCompare",
      url: `https://min-api.cryptocompare.com/data/price?fsym=${asset}&tsyms=${fiat}`,
      parse: (data: any) => data[fiat],
    },
  ];

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url);
      const data = await response.json();
      const rate = provider.parse(data);

      if (rate && rate > 0) {
        return {
          ok: true,
          rate,
          source: provider.name,
          fiat,
          asset,
        };
      }
    } catch (error) {
      // Continue to next provider
      console.debug(`${provider.name} rate fetch failed`);
    }
  }

  return {
    ok: false,
    error: "All rate providers unavailable",
    rate: undefined,
    source: undefined,
  };
}
```

**Complexity**: Medium (fallback pattern, multiple APIs)
**Time**: 1.5 hours

---

## Detailed Utilities

### Category 1: No Dependencies (4 files, 4 hours)

#### swapPayload.ts (Most Complex Utility)
```typescript
import type { Token, QuotePayload } from "@/lib/types";

// Token lookup
export function getTokenId(token: Token): string | null {
  return token.id || token.assetId || token.tokenId || null;
}

export function findToken(tokens: Token[], tokenId: string): Token | null {
  return tokens.find((t) => getTokenId(t) === tokenId) || null;
}

// Base units conversion
export function toBaseUnits(amountStr: string, decimals: number): string | null {
  const amount = parseFloat(String(amountStr).trim());
  if (!Number.isFinite(amount) || amount <= 0) return null;

  try {
    const baseUnits = BigInt(amount * Math.pow(10, decimals));
    return baseUnits.toString();
  } catch {
    return null;
  }
}

export function baseUnitsToDecimal(
  amountBase: string,
  decimals: number
): string {
  const divisor = BigInt(Math.pow(10, decimals));
  const amount = BigInt(amountBase) / divisor;
  const remainder = BigInt(amountBase) % divisor;

  if (remainder === 0n) {
    return amount.toString();
  }

  const remainderStr = remainder.toString().padStart(decimals, "0");
  return `${amount}.${remainderStr.replace(/0+$/, "")}`;
}

// Payload building
export function buildQuotePayload(
  body: {
    fromToken: string;
    toToken: string;
    amountIn: string;
    destAddress: string;
    refundAddress: string;
    slippageTolerance?: number;
  },
  options: { dry: boolean; tokensPayload: Token[] }
): QuotePayload | { error: string } {
  const { fromToken, toToken, amountIn, destAddress, refundAddress } = body;

  // Validation
  if (!fromToken || !toToken) return { error: "Invalid tokens" };
  if (!amountIn) return { error: "Amount required" };
  if (!destAddress) return { error: "Destination required" };

  // Token lookup
  const origin = findToken(options.tokensPayload, fromToken);
  const destination = findToken(options.tokensPayload, toToken);

  if (!origin || !destination) {
    return { error: "Unsupported tokens" };
  }

  // Amount conversion
  const baseUnits = toBaseUnits(amountIn, origin.decimals || 8);
  if (!baseUnits) return { error: "Invalid amount" };

  // Build payload
  const slippage = intBps(body.slippageTolerance, 50);
  const deadline = new Date(Date.now() + 60000).toISOString();

  return {
    dry: options.dry,
    swapType: "EXACT_INPUT",
    slippageTolerance: slippage,
    originAsset: fromToken,
    destinationAsset: toToken,
    amount: baseUnits,
    depositType: origin.blockchain || "unknown",
    refundTo: refundAddress,
    refundType: origin.blockchain || "unknown",
    recipient: destAddress,
    recipientType: destination.blockchain || "unknown",
    deadline,
    quoteWaitingTimeMs: 45000,
  };
}

// Basis points conversion
function intBps(value: any, def: number = 50): number {
  const v = parseFloat(String(value ?? "").trim());
  if (!Number.isFinite(v) || v < 0) return def;
  const bps = Math.round(v * 100);
  return Math.max(0, Math.min(10000, bps));
}
```

**Complexity**: High (BigInt arithmetic, validation chains)
**Time**: 2 hours

---

#### addressValidation.ts
```typescript
import type { ValidationResult } from "@/lib/types";

export function validateAddressForBlockchain(
  address: string,
  blockchain: string
): ValidationResult {
  const validator = VALIDATORS[blockchain.toLowerCase()];
  if (!validator) {
    return { valid: false, error: `Unknown blockchain: ${blockchain}` };
  }
  return validator(address);
}

type Validator = (address: string) => ValidationResult;

const VALIDATORS: Record<string, Validator> = {
  bitcoin: validateBtcAddress,
  ethereum: validateEthAddress,
  solana: validateSolAddress,
  near: validateNearAddress,
  zcash: validateZecAddress,
};

function validateBtcAddress(address: string): ValidationResult {
  // P2PKH (1...), P2SH (3...), Bech32 (bc1...)
  const patterns = [
    /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // P2PKH, P2SH
    /^bc1[a-z0-9]{39,59}$/, // Bech32
  ];

  const valid = patterns.some((p) => p.test(address));
  return {
    valid,
    error: valid ? null : "Invalid Bitcoin address format",
  };
}

function validateEthAddress(address: string): ValidationResult {
  const valid = /^0x[a-fA-F0-9]{40}$/.test(address);
  return {
    valid,
    error: valid ? null : "Invalid Ethereum address format",
  };
}

function validateSolAddress(address: string): ValidationResult {
  const valid = /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(address);
  return {
    valid,
    error: valid ? null : "Invalid Solana address format",
  };
}

function validateNearAddress(address: string): ValidationResult {
  const valid = /^[a-z0-9_-]{2,64}$/.test(address);
  return {
    valid,
    error: valid ? null : "Invalid NEAR address format",
  };
}

function validateZecAddress(address: string): ValidationResult {
  const valid =
    /^t[1-3][a-km-zA-HJ-NP-Z1-9]{33}$/.test(address) || // Transparent
    /^z[a-km-zA-HJ-NP-Z1-9]{94}$/.test(address); // Sapling/Unified

  return {
    valid,
    error: valid ? null : "Invalid Zcash address format",
  };
}
```

**Complexity**: Medium (blockchain-specific validators)
**Time**: 1.5 hours

---

### Category 2: Supabase Utilities (7 files, 6 hours)

#### supabase-server.ts (1 hour)
```typescript
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Missing Supabase environment variables");
    return null;
  }

  return createClient(url, key);
}
```

#### searchProfiles.ts (1.5 hours)
```typescript
import type { Profile, ServerActionResponse } from "@/lib/types";

export async function searchProfiles(
  query: string,
  limit: number = 20
): Promise<Profile[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .or(`name.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  return data || [];
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("zcasher")
    .select("id")
    .eq("name", username)
    .limit(1)
    .single();

  return !!data && !error;
}
```

---

### Category 3: Transform Functions (4 files, 6 hours)

#### profileUtils.ts (COMPLEX)
```typescript
import type { Profile, WarningConfig, ProfileTrust } from "@/lib/types";

export function getProfileTrust(profile: Profile): ProfileTrust {
  const verifiedAddress = profile.address_verified ?? false;
  const verifiedLinks = profile.verified_links_count ?? 0;
  const totalLinks = profile.total_links ?? 0;

  return {
    verifiedAddress,
    verifiedLinks,
    hasVerifiedContent: verifiedLinks > 0,
    isVerified: verifiedAddress || verifiedLinks > 0,
    canAuthenticateLinks: verifiedAddress,
  };
}

export function getWarningConfig(
  profile: Profile,
  warning?: string,
  verifiedAddress?: boolean,
  verifiedLinks?: number,
  totalLinks?: number,
  hasDuplicateNames?: boolean
): WarningConfig | null {
  const trust = getProfileTrust(profile);

  // No warning needed
  if (trust.isVerified) return null;

  // Duplicate names warning
  if (hasDuplicateNames) {
    return {
      tone: "yellow",
      summary: `${totalLinks ?? 0} profiles with name "${profile.name}"`,
      toggleLabel: "View similar profiles",
      details: [
        "Multiple profiles share this name",
        "Check trust indicators to identify the right profile",
      ],
    };
  }

  // No verified links warning
  if (!trust.hasVerifiedContent) {
    return {
      tone: "red",
      summary: "Not verified",
      toggleLabel: "Why verification matters",
      details: [
        "This profile has no verified links or address",
        "Verification adds authenticity and trust",
      ],
    };
  }

  // Some content but no address verification
  if (!trust.verifiedAddress) {
    return {
      tone: "yellow",
      summary: `${verifiedLinks} verified link${verifiedLinks !== 1 ? "s" : ""}, but no address verification`,
      toggleLabel: "Learn more",
      details: ["Address verification increases trust"],
    };
  }

  return null;
}

export function getRankType(profile: Profile): "alltime" | "weekly" | "monthly" | null {
  if (profile.rank_alltime) return "alltime";
  if (profile.rank_weekly) return "weekly";
  if (profile.rank_monthly) return "monthly";
  return null;
}

// ... more utility functions
```

**Complexity**: High (complex conditional logic)
**Time**: 2 hours

---

#### profileLinks.ts (COMPLEX)
```typescript
import type { Link, EnrichedLink } from "@/lib/types";

const KNOWN_DOMAINS: Record<string, { icon: string; label: string }> = {
  "github.com": { icon: "/icons/github.svg", label: "GitHub" },
  "twitter.com": { icon: "/icons/twitter.svg", label: "Twitter" },
  "x.com": { icon: "/icons/x.svg", label: "X" },
  // ... 20+ more entries
};

export function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace("www.", "");
  } catch {
    return "";
  }
}

export function getLinkIcon(url: string): string {
  const domain = extractDomain(url);
  return KNOWN_DOMAINS[domain]?.icon || "/icons/link.svg";
}

export function getLinkLabel(url: string): string {
  const domain = extractDomain(url);
  return KNOWN_DOMAINS[domain]?.label || "Website";
}

export function enrichLink(link: Link): EnrichedLink {
  const domain = extractDomain(link.url);
  const dbLabel = link.label?.toLowerCase().trim();
  const domainLabel = KNOWN_DOMAINS[domain]?.label?.toLowerCase() || "";

  const handle = getSocialHandle(link.url);
  const isHandleDomain = dbLabel === "@" + handle;

  const shouldUseHandle =
    !!handle &&
    !isHandleDomain &&
    (!dbLabel ||
      dbLabel === domainLabel.toLowerCase() ||
      dbLabel === `www.${domainLabel.toLowerCase()}`);

  return {
    ...link,
    icon: getLinkIcon(link.url),
    label: shouldUseHandle ? `@${handle}` : (link.label || getLinkLabel(link.url)),
  };
}

export function parseProfileLinks(profile: Profile): {
  linksArray: EnrichedLink[];
  totalLinks: number;
} {
  const linksArray = (profile.links || [])
    .filter((link) => link.url)
    .map(enrichLink);

  return {
    linksArray,
    totalLinks: profile.total_links || linksArray.length,
  };
}
```

**Complexity**: High (domain mapping, handle extraction)
**Time**: 2 hours

---

### Category 4: External APIs (2 files, 8 hours)

#### oneClick.ts (COMPLEX - Token & Quote API)
```typescript
import type { Token, QuotePayload, QuoteResponse } from "@/lib/types";

const TIMEOUT_MS = 45000;
const ALLOWED_SYMBOLS = ["ZEC", "BTC", "ETH", "USDC", "USDT", "SOL"];

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function oneclickTokens(): Promise<{
  tokens?: Token[];
  error?: string;
}> {
  try {
    const response = await fetchWithTimeout(
      "https://api.oneclick.exchange/tokens",
      {
        headers: {
          "X-API-Key": process.env.ONECLICK_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      return { error: "Failed to fetch tokens" };
    }

    const data = await response.json();
    const tokens: Token[] = (data.tokens || [])
      .filter((t: any) => ALLOWED_SYMBOLS.includes(t.symbol))
      .filter((t: any) => t.symbol !== "ZEC" || t.blockchain === "zcash")
      .map((t: any) => ({
        id: t.id,
        symbol: t.symbol,
        decimals: t.decimals,
        blockchain: t.blockchain,
        logo: t.logo,
      }));

    return { tokens };
  } catch (error) {
    return { error: "Token fetch timeout or error" };
  }
}

export async function oneclickQuote(payload: QuotePayload): Promise<{
  quote?: any;
  quoteId?: string;
  error?: string;
}> {
  try {
    const response = await fetchWithTimeout(
      "https://api.oneclick.exchange/quote",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.ONECLICK_API_KEY || "",
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      const errorData = parseErrorResponse(text);
      return { error: errorData.error || "Quote request failed" };
    }

    const data = JSON.parse(text);
    return {
      quoteId: data.quoteId || data.id,
      quote: data.quote || data,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Quote request failed",
    };
  }
}

function parseErrorResponse(text: string): { error: string } {
  try {
    const data = JSON.parse(text);
    const error = data.error || data.message || data.detail;
    return { error: error || "Unknown error" };
  } catch {
    return { error: "Request failed" };
  }
}
```

**Complexity**: Very High (timeout handling, error extraction, API integration)
**Time**: 3-4 hours

---

#### profileFetcher.ts (COMPLEX - Multi-Stage Lookup)
```typescript
import type { Profile, RankedProfile } from "@/lib/types";

export async function fetchProfileForSlug(
  rawSlug: string
): Promise<RankedProfile | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const slug = normalizeSlug(rawSlug);
  let profile: Profile | null = null;

  // Stage 1: Try ID extraction from "name-id" format
  const match = slug.match(/^(.+)-(\d+)$/);
  if (match) {
    const [, , idStr] = match;
    const id = parseInt(idStr, 10);
    const { data } = await supabase
      .from("zcasher")
      .select("*")
      .eq("id", id)
      .single();
    if (data) profile = data;
  }

  // Stage 2: Try exact slug match
  if (!profile) {
    const { data } = await supabase
      .from("zcasher")
      .select("*")
      .eq("slug", slug)
      .single();
    if (data) profile = data;
  }

  // Stage 3: Try name match with normalization
  if (!profile) {
    const { data: candidates } = await supabase
      .from("zcasher")
      .select("*")
      .ilike("name", `%${slug}%`)
      .limit(10);

    if (candidates) {
      const normalized = candidates.map((c) => ({
        ...c,
        normalizedName: normalizeSlug(c.name),
      }));

      profile =
        normalized.find((c) => c.normalizedName === slug) ||
        normalized[0] ||
        null;
    }
  }

  if (!profile) return null;

  // Stage 4: Fetch rankings in parallel
  const [alltime, weekly, monthly] = await Promise.all([
    supabase
      .from("referrer_ranked_alltime")
      .select("rank_alltime")
      .eq("referred_by_zcasher_id", String(profile.id))
      .single(),
    supabase
      .from("referrer_ranked_weekly")
      .select("rank_weekly")
      .eq("referred_by_zcasher_id", String(profile.id))
      .single(),
    supabase
      .from("referrer_ranked_monthly")
      .select("rank_monthly")
      .eq("referred_by_zcasher_id", String(profile.id))
      .single(),
  ]);

  return {
    ...profile,
    rank_alltime: alltime.data?.rank_alltime || 0,
    rank_weekly: weekly.data?.rank_weekly || 0,
    rank_monthly: monthly.data?.rank_monthly || 0,
  };
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
```

**Complexity**: Very High (multi-stage fallback, Promise.all, normalization)
**Time**: 3-4 hours

---

## Migration Checklist

### Phase 3: Library/Utility Files (18-25 hours)

#### Tier 1: No Dependencies (4 hours)
- [ ] swapPayload.ts (2 hours) - START HERE
- [ ] addressValidation.ts (1.5 hours)
- [ ] tokenUtils.ts (30 min)
- [ ] validateUrl.ts (1 hour)

#### Tier 2: Supabase-Dependent (6 hours)
- [ ] supabase-server.ts (1 hour) - prerequisite for others
- [ ] searchCities.ts (1 hour)
- [ ] searchProfiles.ts (1.5 hours)
- [ ] profileQueries.ts (1 hour)
- [ ] verifyLinkDb.ts (1.5 hours)
- [ ] createProfile.ts (1 hour)
- [ ] confirmOtp.ts (1 hour)

#### Tier 3: Transform Functions (6 hours)
- [ ] profileLinks.ts (2 hours) - complex domain mapping
- [ ] profileUtils.ts (2 hours) - complex conditional logic
- [ ] usernameNormalizer.ts (1 hour)
- [ ] zcashUtils.ts (1 hour)

#### Tier 4: External APIs (5 hours)
- [ ] oneClick.ts (3-4 hours) - COMPLEX, timeout handling
- [ ] profileFetcher.ts (2-3 hours) - COMPLEX, multi-stage

#### Tier 5: Additional (2 hours)
- [ ] fetchTokens.ts (1 hour) - Next.js caching
- [ ] getRateAction.ts (1.5 hours) - provider fallback

### Phase 4: Server Actions (10-15 hours)

#### Group 1: Simple Wrappers (3 hours)
- [ ] confirmOtpAction.ts (30 min)
- [ ] updateLinkVerificationAction.ts (30 min)
- [ ] checkAddressTakenAction.ts (30 min)
- [ ] checkUsernameExistsAction.ts (30 min)
- [ ] checkUsernameIsVerifiedAction.ts (30 min)
- [ ] getProfileLinksAction.ts (30 min)
- [ ] getProfileLinksBatchAction.ts (1 hour)

#### Group 2: Search Operations (2 hours)
- [ ] searchCitiesAction.ts (1 hour)
- [ ] searchProfilesAction.ts (1 hour)

#### Group 3: Profile Creation (2 hours)
- [ ] createProfileAction.ts (2 hours) - multiple functions

#### Group 4: Complex with Rankings (3 hours)
- [ ] getNsProfilesAction.ts (3 hours) - COMPLEX

#### Group 5: Swap Operations (4-6 hours)
- [ ] quoteAction.ts (2-3 hours) - COMPLEX
- [ ] confirmAction.ts (2-3 hours) - similar to quote
- [ ] depositAction.ts (1 hour)
- [ ] fetchTokens.ts (1 hour) - caching wrapper (already done above)
- [ ] getRateAction.ts (1.5 hours) - fallback pattern (already done above)

---

## Type Files to Create

### types/index.ts
```typescript
export type Profile = { ... };
export type Link = { ... };
export type City = { ... };
export type Token = { ... };
export type QuotePayload = { ... };
export type QuoteResponse = { ... };
// ... core types
```

### types/api.ts
```typescript
export type ApiErrorResponse = { ... };
export type FetchResult<T> = T | { error: string };
export type OneClickTokensResponse = { ... };
// ... API types
```

### types/swap.ts
```typescript
export type SwapState = { ... };
export type SwapContextType = { ... };
export type AmountAndWalletProps = { ... };
// ... swap types
```

---

## Key Patterns to Implement

1. **Discriminated Union for Results**: `{ ok: true; data: T } | { ok: false; error: string }`
2. **Promise.all Typing**: Specify tuple type for results
3. **Error Transformation**: Map API errors to user-friendly messages
4. **Fallback Chains**: Try provider → next provider pattern
5. **Pagination Loop**: Accumulate results until total reached
6. **Caching**: Use unstable_cache with revalidate and tags

---

Next: See `03-APP-DIRECTORY-ANALYSIS.md` for Pages, Layouts, and API Routes

Generated: 2026-02-08
Related: Lib utilities in Phase 3, Server actions in Phase 4
