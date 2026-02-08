# App Directory Analysis: TypeScript Migration

**File Count**: 2 API routes, 6 pages, 3 layouts, 4 context providers, 8 custom hooks
**Estimated Conversion Time**: 28-42 hours (12-20 hours pages/API + 8-10 hours providers + 8-12 hours hooks)
**Complexity**: Medium-High (Next.js 15+ async patterns, context state management)
**Critical Pattern**: Async params as Promise<T>

---

## Table of Contents

1. [API Routes Analysis](#api-routes-analysis)
2. [Pages & Layouts Structure](#pages--layouts-structure)
3. [Dynamic Routes ([slug]) Handling](#dynamic-routes-slug-handling)
4. [Context Providers Deep Dive](#context-providers-deep-dive)
5. [Custom Hooks Analysis](#custom-hooks-analysis)
6. [Next.js Specific Patterns](#nextjs-specific-patterns)
7. [Conversion Roadmap](#conversion-roadmap)

---

## API Routes Analysis

### Route 1: /api/search/route.js

**Purpose**: Search profiles and check username existence
**Pattern**: GET endpoint with query parameters

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { NextResponse as NextResponseType } from "next/server";
import { searchProfilesAction, checkUsernameExistsAction } from "@/lib/directory";
import type { ServerActionResponse, Profile } from "@/lib/types";

export const dynamic = "force-dynamic"; // Real-time search

interface SearchQueryParams {
  q?: string;
  limit?: string | number;
}

interface SearchResponse {
  profiles: Profile[];
  exists: boolean;
}

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function GET(
  request: NextRequest
): Promise<NextResponseType<ApiResponse<SearchResponse>>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = parseInt(searchParams.get("limit") || "3", 10);

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Query parameter required" },
        { status: 400 }
      );
    }

    // Call server actions
    const profileResult = await searchProfilesAction(query, limit);
    const usernameResult = await checkUsernameExistsAction(query);

    const profiles = profileResult.ok ? profileResult.data : [];
    const exists = usernameResult.ok ? usernameResult.exists : false;

    return NextResponse.json({
      success: true,
      data: { profiles, exists },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    );
  }
}
```

**Complexity**: Medium
**Key Challenges**:
- Type NextRequest/NextResponse properly
- Validate query parameters
- Call server actions and aggregate results
- Return typed JSON response

**Time**: 1 hour

---

### Route 2: /api/swap/status/route.js

**Purpose**: Check swap transaction status
**Pattern**: GET endpoint with required parameter

```typescript
// app/api/swap/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { SwapStatusResult } from "@/lib/types";
import { oneclickStatus } from "@/lib/swap/oneClick";

interface SwapStatusQuery {
  depositAddress?: string;
}

type ApiSwapStatusResponse =
  | {
      success: true;
      status: string;
      swapDetails?: Record<string, any>;
      updatedAt: string;
    }
  | { success: false; error: string };

export async function GET(
  request: NextRequest
): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const depositAddress = searchParams.get("depositAddress");

    if (!depositAddress) {
      return NextResponse.json(
        { success: false, error: "depositAddress parameter required" },
        { status: 400 }
      );
    }

    const result = await oneclickStatus({ depositAddress });

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status || "unknown",
      swapDetails: result,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 }
    );
  }
}
```

**Complexity**: Low-Medium
**Key Challenges**:
- Validate required parameters
- Handle external API errors
- Return typed responses

**Time**: 1 hour

---

## Pages & Layouts Structure

### Root Layout: app/layout.jsx

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Zcash Directory",
  description: "Zcash profile directory",
  // ... other metadata
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Complexity**: Low
**Time**: 15 minutes

---

### Home Page: app/page.jsx (Server Component)

```typescript
// app/page.tsx
import type { Metadata } from "next";
import { getProfileCount } from "@/lib/profile/profileQueries";
import { getNsProfilesAction } from "@/lib/directory/getNsProfilesAction";
import HomePage from "@/app/HomePage";
import type { Profile } from "@/lib/types";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = {
  title: "Home",
  description: "Zcash Profile Directory",
};

interface HomePageServerProps {}

export default async function Page({}: HomePageServerProps) {
  // Fetch data in parallel
  const [profileCountResult, profilesResult] = await Promise.all([
    getProfileCount(),
    getNsProfilesAction(),
  ]);

  const profileCount = profileCountResult;
  const initialFeaturedProfiles = profilesResult.ok
    ? profilesResult.data.slice(0, 5)
    : [];

  return (
    <HomePage
      initialFeaturedProfiles={initialFeaturedProfiles}
      profileCount={profileCount}
    />
  );
}
```

**Complexity**: Medium (async data fetching, ISR)
**Key Challenges**:
- Type async function props
- Parallel data fetching with Promise.all
- Type Metadata export
- Pass initial data to client component

**Time**: 1.5 hours

---

### Dynamic Profile Page: app/[slug]/page.jsx (Server Component)

```typescript
// app/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getProfileCount } from "@/lib/profile/profileQueries";
import { getDuplicateNameCount } from "@/lib/profile/profileQueries";
import ProfilePage from "@/app/[slug]/ProfilePage";
import type { Profile } from "@/lib/types";

interface ProfilePageParams {
  slug: string;
}

interface ProfilePageProps {
  params: Promise<ProfilePageParams>;
}

// Optional: Pre-generate popular profile pages
export async function generateStaticParams(): Promise<ProfilePageParams[]> {
  // Return most popular profiles to pre-generate
  return [
    { slug: "alice" },
    { slug: "bob-1" },
    // ... top N profiles
  ];
}

export async function generateMetadata(
  { params }: ProfilePageProps
): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    return {
      title: "Profile Not Found",
    };
  }

  return {
    title: profile.display_name || profile.name,
    description: profile.bio || "Zcash profile",
    openGraph: {
      title: profile.display_name || profile.name,
      description: profile.bio,
      images: profile.profile_image_url ? [profile.profile_image_url] : [],
    },
  };
}

export default async function Page({ params }: ProfilePageProps) {
  const { slug } = await params; // CRITICAL: Must await params

  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    notFound(); // Returns 404
  }

  const [profileCount, duplicateNameCount] = await Promise.all([
    getProfileCount(),
    getDuplicateNameCount(profile.name),
  ]);

  return (
    <ProfilePage
      initialProfile={profile}
      profileCount={profileCount}
      duplicateNameCount={duplicateNameCount}
    />
  );
}
```

**Complexity**: High (async params, metadata generation, dynamic routes)
**Key Challenges**:
- **CRITICAL**: Type `params` as `Promise<T>` and await it (Next.js 15+ pattern)
- Generate metadata dynamically
- Use notFound() from Next.js navigation
- Parallel data fetching
- Optional: Pre-generate static pages

**Time**: 2 hours

---

### Profile Layout: app/[slug]/layout.jsx

```typescript
// app/[slug]/layout.tsx
import { Providers } from "@/app/[slug]/providers";
import type { Metadata } from "next";

interface ProfileLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function Layout({
  children,
  params,
}: ProfileLayoutProps) {
  return (
    <Providers>
      {children}
    </Providers>
  );
}
```

**Complexity**: Low (context provider wrapper)
**Time**: 15 minutes

---

### NS Directory Page: app/ns/page.jsx (Server Component)

```typescript
// app/ns/page.tsx
import { getNsProfilesAction } from "@/lib/directory/getNsProfilesAction";
import DirectoryNS from "@/app/ns/DirectoryNS";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic"; // Always fresh

interface NsPageProps {}

export default async function Page({}: NsPageProps) {
  const result = await getNsProfilesAction();
  const initialProfiles = result.ok ? result.data : [];

  return <DirectoryNS initialProfiles={initialProfiles} />;
}
```

**Complexity**: Low
**Time**: 30 minutes

---

### Static Pages

```typescript
// app/privacy/page.tsx
export default function PrivacyPage() {
  return (
    <div>
      {/* Static content */}
    </div>
  );
}

// app/terms/page.tsx
export default function TermsPage() {
  return (
    <div>
      {/* Static content */}
    </div>
  );
}
```

**Complexity**: Low
**Time**: 15 minutes each

---

## Dynamic Routes ([slug]) Handling

### The Critical Pattern: Async Params

```typescript
// WRONG - Old Next.js pattern (pre-15)
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params; // Not a Promise
  // ...
}

// CORRECT - Next.js 15+ pattern
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params; // Must await!
  // Now you can use slug
}
```

### Slug Validation & Normalization

```typescript
// Handle different slug formats:
// 1. Exact slug: /alice
// 2. Slug with ID: /alice-123
// 3. Display name: /alice-wonder (normalized)

async function fetchProfileForSlug(rawSlug: string): Promise<Profile | null> {
  const slug = normalizeSlug(rawSlug);

  // Try ID extraction first
  const match = slug.match(/^(.+)-(\d+)$/);
  if (match) {
    const id = parseInt(match[2], 10);
    const profile = await getProfileById(id);
    if (profile) return profile;
  }

  // Try exact slug match
  let profile = await getProfileBySlug(slug);
  if (profile) return profile;

  // Try name match with normalization
  profile = await getProfileByNameFuzzy(slug);
  return profile;
}
```

### Error Handling with notFound()

```typescript
import { notFound } from "next/navigation";

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    notFound(); // Returns 404 page
  }

  return <ProfilePage profile={profile} />;
}
```

---

## Context Providers Deep Dive

### Provider Structure

All 4 providers are Client Components that manage state and expose context hooks.

### 1. SelectionProvider (Simplest)

```typescript
// app/[slug]/providers/selection-provider.tsx
"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface SelectionContextType {
  forceShowQR: boolean;
  setForceShowQR: (value: boolean) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [forceShowQR, setForceShowQR] = useState(false);

  return (
    <SelectionContext.Provider
      value={{
        forceShowQR,
        setForceShowQR,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextType {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within SelectionProvider");
  }
  return context;
}
```

**Complexity**: Low
**Time**: 30 minutes

---

### 2. EditsProvider

```typescript
// app/[slug]/providers/edits-provider.tsx
"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

type PendingEdits = {
  profile?: Record<string, any>;
  l?: string[]; // link tokens
  d?: string[]; // deleted fields
  c?: string;   // city token
};

interface EditsContextType {
  pendingEdits: PendingEdits;
  setPendingEdits: (field: string, value: any) => void;
  clearPendingEdits: () => void;
  editChangesRequested: boolean;
  setEditChangesRequested: (value: boolean) => void;
}

const EditsContext = createContext<EditsContextType | undefined>(undefined);

export function EditsProvider({ children }: { children: ReactNode }) {
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>({});
  const [editChangesRequested, setEditChangesRequested] = useState(false);

  const handleSetPendingEdits = useCallback((field: string, value: any) => {
    setPendingEdits((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleClearPendingEdits = useCallback(() => {
    setPendingEdits({});
    setEditChangesRequested(false);
  }, []);

  return (
    <EditsContext.Provider
      value={{
        pendingEdits,
        setPendingEdits: handleSetPendingEdits,
        clearPendingEdits: handleClearPendingEdits,
        editChangesRequested,
        setEditChangesRequested,
      }}
    >
      {children}
    </EditsContext.Provider>
  );
}

export function useEdits(): EditsContextType {
  const context = useContext(EditsContext);
  if (!context) {
    throw new Error("useEdits must be used within EditsProvider");
  }
  return context;
}
```

**Complexity**: Medium
**Time**: 1 hour

---

### 3. MessagingProvider

```typescript
// app/[slug]/providers/messaging-provider.tsx
"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type DraftMessage = {
  memo: string;
  amount: string;
};

type VerifyState = {
  memo: string;
  amount: string;
  zId: string | null;
  requestId: string | null;
};

interface MessagingContextType {
  mode: "note" | "verify";
  setMode: (mode: "note" | "verify") => void;
  draft: DraftMessage;
  verify: VerifyState;
  setDraftMemo: (v: string) => void;
  setDraftAmount: (v: string) => void;
  setVerifyMemo: (v: string) => void;
  setVerifyAmount: (v: string) => void;
  setVerifyId: (zId: string | null) => void;
  setVerifyRequestId: (requestId: string | null) => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"note" | "verify">("note");
  const [draft, setDraft] = useState<DraftMessage>({ memo: "", amount: "" });
  const [verify, setVerify] = useState<VerifyState>({
    memo: "",
    amount: "",
    zId: null,
    requestId: null,
  });

  return (
    <MessagingContext.Provider
      value={{
        mode,
        setMode,
        draft,
        verify,
        setDraftMemo: (memo) => setDraft((prev) => ({ ...prev, memo })),
        setDraftAmount: (amount) => setDraft((prev) => ({ ...prev, amount })),
        setVerifyMemo: (memo) => setVerify((prev) => ({ ...prev, memo })),
        setVerifyAmount: (amount) => setVerify((prev) => ({ ...prev, amount })),
        setVerifyId: (zId) => setVerify((prev) => ({ ...prev, zId })),
        setVerifyRequestId: (requestId) =>
          setVerify((prev) => ({ ...prev, requestId })),
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging(): MessagingContextType {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used within MessagingProvider");
  }
  return context;
}
```

**Complexity**: Medium
**Time**: 1.5 hours

---

### 4. SwapProvider (MOST COMPLEX)

```typescript
// app/[slug]/providers/swap-provider.tsx
"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { getSwapTokens, getSwapQuote, confirmSwap } from "@/lib/swap";
import type { Token, ServerActionResponse } from "@/lib/types";

interface SwapContextType {
  // Input state
  originTokenId: string | null;
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;

  // Token state
  tokenOptions: Token[];
  zecTokenId: string | null;
  isLoadingTokens: boolean;

  // Quote state
  quoteData: Record<string, any> | null;
  quotePreview: Record<string, any> | null;

  // Swap state
  depositUri: string;
  statusKey: Record<string, any> | null;
  swapStatus: string;

  // UI state
  isGettingQuote: boolean;
  isConfirming: boolean;
  quoteStatus: string;
  swapError: string;

  // Computed
  isSwapMode: boolean;
  selectedOriginToken?: Token;
  originSymbol: string;

  // Actions
  setToken: (tokenId: string) => void;
  setSwapAmount: (amount: string) => void;
  setRefundAddress: (address: string) => void;
  setSlippageTolerance: (slippage: string) => void;
  getQuote: (params: any) => Promise<any>;
  confirmSwap: (params: any) => Promise<any>;
  resetSwapState: () => void;
  loadTokens: () => Promise<void>;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
  const [originTokenId, setOriginTokenId] = useState<string | null>(null);
  const [swapAmount, setSwapAmount] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("50");

  const [tokenOptions, setTokenOptions] = useState<Token[]>([]);
  const [zecTokenId, setZecTokenId] = useState<string | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  const [quoteData, setQuoteData] = useState<Record<string, any> | null>(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState("");

  const [depositUri, setDepositUri] = useState("");
  const [swapStatus, setSwapStatus] = useState("");
  const [swapError, setSwapError] = useState("");

  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const result = await getSwapTokens();
      if (result.ok && result.data) {
        setTokenOptions(result.data);
        const zecToken = result.data.find((t) => t.symbol === "ZEC");
        setZecTokenId(zecToken?.id || null);
      }
    } catch (error) {
      console.error("Failed to load tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  const handleGetQuote = useCallback(
    async (params: any) => {
      setIsGettingQuote(true);
      setQuoteStatus("loading");
      setSwapError("");

      try {
        const result = await getSwapQuote(params);
        if (result.ok) {
          setQuoteData(result.data);
          setQuoteStatus("success");
          return result.data;
        } else {
          setSwapError(result.error || "Failed to get quote");
          setQuoteStatus("error");
          return null;
        }
      } catch (error) {
        setSwapError(error instanceof Error ? error.message : "Quote failed");
        setQuoteStatus("error");
        return null;
      } finally {
        setIsGettingQuote(false);
      }
    },
    []
  );

  const handleConfirmSwap = useCallback(async (params: any) => {
    // Similar implementation
    return null;
  }, []);

  const selectedOriginToken = tokenOptions.find((t) => t.id === originTokenId);
  const originSymbol = selectedOriginToken?.symbol || "";

  return (
    <SwapContext.Provider
      value={{
        originTokenId,
        swapAmount,
        refundAddress,
        slippageTolerance,
        tokenOptions,
        zecTokenId,
        isLoadingTokens,
        quoteData,
        quotePreview: null,
        depositUri,
        statusKey: null,
        swapStatus,
        isGettingQuote,
        isConfirming: false,
        quoteStatus,
        swapError,
        isSwapMode: !!originTokenId,
        selectedOriginToken,
        originSymbol,
        setToken: setOriginTokenId,
        setSwapAmount,
        setRefundAddress,
        setSlippageTolerance,
        getQuote: handleGetQuote,
        confirmSwap: handleConfirmSwap,
        resetSwapState: () => {
          setOriginTokenId(null);
          setSwapAmount("");
          setRefundAddress("");
          setQuoteData(null);
          setSwapStatus("");
          setSwapError("");
        },
        loadTokens,
      }}
    >
      {children}
    </SwapContext.Provider>
  );
}

export function useSwap(): SwapContextType {
  const context = useContext(SwapContext);
  if (!context) {
    throw new Error("useSwap must be used within SwapProvider");
  }
  return context;
}
```

**Complexity**: Very High (10+ state fields, multiple actions, async callbacks)
**Time**: 3-4 hours

---

### Provider Composition

```typescript
// app/[slug]/providers.tsx
"use client";

import { SelectionProvider } from "./providers/selection-provider";
import { EditsProvider } from "./providers/edits-provider";
import { MessagingProvider } from "./providers/messaging-provider";
import { SwapProvider } from "./providers/swap-provider";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SelectionProvider>
      <EditsProvider>
        <MessagingProvider>
          <SwapProvider>
            {children}
          </SwapProvider>
        </MessagingProvider>
      </EditsProvider>
    </SelectionProvider>
  );
}
```

**Time**: 15 minutes

---

## Custom Hooks Analysis

### Hook 1: useVerificationPolling

```typescript
// app/[slug]/providers/useVerificationPolling.ts
import { useEffect, useRef, useState } from "react";

interface VerificationPollingOptions {
  requestId: string | null;
  maxPolls?: number;
  pollInterval?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

interface UseVerificationPollingReturn {
  isPolling: boolean;
  status: string;
  pollCount: number;
  error?: string;
}

export function useVerificationPolling({
  requestId,
  maxPolls = 60,
  pollInterval = 5000,
  onSuccess,
  onError,
}: VerificationPollingOptions): UseVerificationPollingReturn {
  const [isPolling, setIsPolling] = useState(!!requestId);
  const [status, setStatus] = useState("pending");
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string>();

  const pollCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!requestId) {
      setIsPolling(false);
      return;
    }

    const poll = async () => {
      if (pollCountRef.current >= maxPolls) {
        setIsPolling(false);
        onError?.("Polling timeout");
        return;
      }

      try {
        // Fetch verification status
        const response = await fetch(
          `/api/verification/status?requestId=${requestId}`
        );
        const data = await response.json();

        setPollCount(++pollCountRef.current);

        if (data.status === "verified") {
          setStatus("verified");
          setIsPolling(false);
          onSuccess?.(data);
          return;
        } else if (data.status === "failed") {
          setStatus("failed");
          setIsPolling(false);
          setError(data.error);
          onError?.(data.error);
          return;
        }

        setStatus(data.status || "pending");

        // Schedule next poll
        timeoutRef.current = setTimeout(poll, pollInterval);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Poll failed";
        setError(message);
        onError?.(message);
        setIsPolling(false);
      }
    };

    poll();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [requestId, maxPolls, pollInterval, onSuccess, onError]);

  return { isPolling, status, pollCount, error };
}
```

**Complexity**: Medium-High (useEffect with cleanup, polling logic)
**Time**: 1.5 hours

---

### Hook 2: useNsDirectory

```typescript
// app/ns/hooks/useNsDirectory.ts
import { useEffect, useState, useCallback } from "react";
import type { Profile } from "@/lib/types";
import { getProfileLinksBatchAction } from "@/lib/profile";

interface UseNsDirectoryReturn {
  profiles: Profile[];
  profilesWithLinks: Array<Profile & { links: any[] }>;
  isLoading: boolean;
  error?: string;
  filterProfiles: (query: string) => void;
}

export function useNsDirectory(
  initialProfiles: Profile[]
): UseNsDirectoryReturn {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [profilesWithLinks, setProfilesWithLinks] = useState<
    Array<Profile & { links: any[] }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Fetch links in batch
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const profileIds = profiles.map((p) => String(p.id));
        const result = await getProfileLinksBatchAction(profileIds);

        if (result.ok && result.data) {
          const enriched = profiles.map((profile) => ({
            ...profile,
            links: result.data[String(profile.id)] || [],
          }));
          setProfilesWithLinks(enriched);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load links");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinks();
  }, [profiles]);

  const filterProfiles = useCallback((query: string) => {
    const filtered = initialProfiles.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    setProfiles(filtered);
  }, [initialProfiles]);

  return {
    profiles,
    profilesWithLinks,
    isLoading,
    error,
    filterProfiles,
  };
}
```

**Complexity**: Medium (async data fetching in useEffect)
**Time**: 1 hour

---

### Hook 3-8: Additional Hooks

Similar patterns for:
- useProfileModal
- useNsFilters
- useNsCounts
- useFlightPaths
- useProfileEvents
- useEmojiAutocomplete

**Time**: 6-9 hours total for all hooks

---

## Next.js Specific Patterns

### 1. Async Server Components

```typescript
export default async function Page() {
  // Can fetch data directly in component
  const data = await fetch(...);
  return <Component data={data} />;
}
```

---

### 2. Async Layout Components

```typescript
interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { slug } = await params;
  // Can fetch layout-level data
  return <>{children}</>;
}
```

---

### 3. Dynamic Params as Promise (Critical!)

```typescript
// CORRECT in Next.js 15+
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params; // Must await!
}
```

---

### 4. Metadata Generation

```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchData(slug);
  return {
    title: data.title,
    description: data.description,
  };
}
```

---

### 5. Static Generation

```typescript
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const profiles = await getPopularProfiles(10);
  return profiles.map((p) => ({ slug: p.slug }));
}
```

---

### 6. Revalidation (ISR)

```typescript
export const revalidate = 300; // Revalidate every 5 minutes
// OR
export const dynamic = "force-dynamic"; // Always fresh
```

---

### 7. Redirect/NotFound

```typescript
import { notFound, redirect } from "next/navigation";

// Return 404
if (!profile) notFound();

// Redirect to different URL
if (oldSlug) redirect(`/new-slug`);
```

---

## Conversion Roadmap

### Phase 5: Pages & API Routes (12-20 hours)

#### API Routes (2 hours)
1. [ ] `app/api/search/route.ts` (1 hour)
2. [ ] `app/api/swap/status/route.ts` (1 hour)

#### Layouts (1 hour)
3. [ ] `app/layout.tsx` (15 min)
4. [ ] `app/[slug]/layout.tsx` (15 min)
5. [ ] `app/ns/layout.tsx` (optional, 15 min)

#### Server Pages (6 hours)
6. [ ] `app/page.tsx` (1.5 hours) - ISR, initial data
7. [ ] `app/[slug]/page.tsx` (2 hours) - Dynamic route, metadata, async params
8. [ ] `app/ns/page.tsx` (1 hour) - Force-dynamic
9. [ ] `app/privacy/page.tsx` (30 min)
10. [ ] `app/terms/page.tsx` (30 min)

#### Client Pages (4 hours)
11. [ ] `app/HomePage.tsx` (1.5 hours) - Animations, useState
12. [ ] `app/swap/page.tsx` (1.5 hours) - Complex polling logic
13. [ ] `app/[slug]/ProfilePage.tsx` (1 hour) - Multiple contexts
14. [ ] `app/ns/DirectoryNS.tsx` (1.5 hours) - Largest file (437 lines)

### Phase 6: Providers & Hooks (12-14 hours)

#### Providers (5-6 hours)
1. [ ] `selection-provider.tsx` (30 min)
2. [ ] `edits-provider.tsx` (1 hour)
3. [ ] `messaging-provider.tsx` (1.5 hours)
4. [ ] `swap-provider.tsx` (3-4 hours) - COMPLEX
5. [ ] `providers.tsx` (15 min)
6. [ ] NS providers (repeat pattern, 1 hour)

#### Hooks (7-8 hours)
7. [ ] `useVerificationPolling.ts` (1.5 hours)
8. [ ] `useNsDirectory.ts` (1 hour)
9. [ ] `useProfileModal.ts` (1 hour)
10. [ ] `useNsFilters.ts` (1 hour)
11. [ ] `useNsCounts.ts` (1 hour)
12. [ ] `useFlightPaths.ts` (1.5 hours)
13. [ ] `useProfileEvents.ts` (1 hour)
14. [ ] `useEmojiAutocomplete.ts` (1 hour)

---

## Key TypeScript Patterns for App Directory

### Pattern 1: Server Component Props
```typescript
interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  // ...
}
```

### Pattern 2: Metadata Type
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "...",
  description: "...",
};
```

### Pattern 3: Context Provider Pattern
```typescript
"use client";

interface ContextType { ... }
const Context = createContext<ContextType | undefined>(undefined);

export function Provider({ children }: { children: ReactNode }) { ... }

export function useContext(): ContextType {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("...");
  return ctx;
}
```

### Pattern 4: Async Server Action Call
```typescript
const result = await serverAction(params);
if (result.ok) {
  // Type-safe data access
} else {
  // Type-safe error handling
}
```

---

## Migration Checklist

- [ ] Phase 5a: API Routes (2 hours)
  - [ ] search/route.ts
  - [ ] swap/status/route.ts

- [ ] Phase 5b: Layouts (1 hour)
  - [ ] app/layout.tsx
  - [ ] [slug]/layout.tsx

- [ ] Phase 5c: Server Pages (6 hours)
  - [ ] app/page.tsx
  - [ ] [slug]/page.tsx (CRITICAL: async params)
  - [ ] ns/page.tsx
  - [ ] privacy/page.tsx
  - [ ] terms/page.tsx

- [ ] Phase 5d: Client Pages (4 hours)
  - [ ] HomePage.tsx
  - [ ] swap/page.tsx
  - [ ] [slug]/ProfilePage.tsx
  - [ ] ns/DirectoryNS.tsx

- [ ] Phase 6a: Providers (5-6 hours)
  - [ ] selection-provider.tsx
  - [ ] edits-provider.tsx
  - [ ] messaging-provider.tsx
  - [ ] swap-provider.tsx (COMPLEX)
  - [ ] providers.tsx
  - [ ] ns-providers.tsx

- [ ] Phase 6b: Hooks (7-8 hours)
  - [ ] useVerificationPolling.ts
  - [ ] useNsDirectory.ts
  - [ ] useProfileModal.ts
  - [ ] useNsFilters.ts
  - [ ] useNsCounts.ts
  - [ ] useFlightPaths.ts
  - [ ] useProfileEvents.ts
  - [ ] useEmojiAutocomplete.ts

---

## Critical Gotchas

1. **Async Params**: Always `params: Promise<T>` and `await params`
2. **Context Hooks**: Must be called in client components (`"use client"`)
3. **Server vs Client**: Page is server, layout is server, children are mixed
4. **Metadata**: Only in server components, use `generateMetadata()` for dynamic
5. **Revalidation**: ISR with `revalidate = 300`, not `cache`
6. **notFound()**: From `next/navigation`, not built-in
7. **Provider Composition**: Nesting order matters for performance

---

Next: See `04-META-PLAN.md` for complete execution timeline
Related: Components in Phase 2, Providers in Phase 6

Generated: 2026-02-08
