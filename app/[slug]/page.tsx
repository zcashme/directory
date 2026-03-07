import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import ProfilePage from "./ProfilePage";
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getDuplicateNameCount } from "@/lib/profile/profileQueries";
import { buildSlug, getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";
import { getSwapTokens } from "@/lib/swap/oneClick";

type SearchParamValue = string | string[] | undefined;
type SearchParamsMap = Record<string, SearchParamValue>;

interface PageParamsProps {
  params: Promise<{ slug: string }>;
}

interface ComposerPrefill {
  memo: string;
  donateAmount: string;
  swapTicker: string;
  swapBaseLayer: string;
  swapAmount: string;
  fiatTicker: string;
  fiatAmount: string;
}

interface PageProps extends PageParamsProps {
  searchParams: Promise<SearchParamsMap>;
}

const MAX_MEMO_BYTES = 512;

function getFirstNonEmptyParam(searchParams: SearchParamsMap, keys: string[]): string {
  for (const key of keys) {
    const value = searchParams[key];
    if (Array.isArray(value)) {
      const first = (value[0] ?? "").trim();
      if (first) return first;
      continue;
    }

    const next = (value ?? "").trim();
    if (next) return next;
  }

  return "";
}

function fitToMaxBytes(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  let result = "";

  for (const ch of text) {
    const next = result + ch;
    if (encoder.encode(next).length > maxBytes) break;
    result = next;
  }

  return result;
}

function sanitizeDecimalAmount(rawValue: string, maxDecimals: number): string {
  const value = rawValue.trim().replace(/,/g, "");
  const normalized = value.endsWith(".") ? value.slice(0, -1) : value;
  if (!normalized || normalized === ".") return "";
  if (!/^\d*\.?\d*$/.test(normalized)) return "";
  if (/^0\d+/.test(normalized)) return "";

  const parts = normalized.split(".");
  if (parts[1] && parts[1].length > maxDecimals) return "";

  const num = Number.parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return "";

  return normalized;
}

function normalizeBaseLayerParam(rawValue: string): string {
  return rawValue.trim().toLowerCase();
}

function buildQuerySuffix(searchParams: SearchParamsMap): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) params.append(key, item);
      });
      continue;
    }
    if (value) params.append(key, value);
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

function parseComposerPrefill(searchParams: SearchParamsMap): ComposerPrefill {
  const memoRaw = getFirstNonEmptyParam(searchParams, ["memo", "m"]);
  const memo = fitToMaxBytes(memoRaw, MAX_MEMO_BYTES);

  const ticker = getFirstNonEmptyParam(searchParams, ["ticker", "asset", "token"]).toUpperCase();
  const fiatTickerRaw = getFirstNonEmptyParam(searchParams, ["fiat", "currency"]).toUpperCase();
  const explicitFiatAmountRaw = getFirstNonEmptyParam(searchParams, [
    "fiat_amount",
    "fiatAmount",
    "fiat_amt",
    "fiatValue",
  ]);
  const baseLayerRaw = getFirstNonEmptyParam(searchParams, [
    "base_layer",
    "baseLayer",
    "base",
    "chain",
    "network",
    "layer",
    "blockchain",
  ]);
  const swapBaseLayer = normalizeBaseLayerParam(baseLayerRaw);

  const sharedAmountRaw = getFirstNonEmptyParam(searchParams, ["amount", "amt", "value"]);
  const zecAmountRaw = getFirstNonEmptyParam(searchParams, ["zec"]);
  const isNonZecTicker = Boolean(ticker && ticker !== "ZEC");

  const parsedSharedCryptoAmount = sanitizeDecimalAmount(sharedAmountRaw, 8);
  const parsedSharedFiatAmount = sanitizeDecimalAmount(sharedAmountRaw, 2);
  const parsedExplicitFiatAmount = sanitizeDecimalAmount(explicitFiatAmountRaw, 2);

  let donateAmount = "";
  let swapAmount = "";
  let fiatAmount = "";

  if (isNonZecTicker) {
    // For non-ZEC ticker links, crypto amount always wins when present.
    swapAmount = parsedSharedCryptoAmount;
    if (!swapAmount && fiatTickerRaw) {
      fiatAmount = parsedExplicitFiatAmount || parsedSharedFiatAmount;
    }
  } else {
    if (fiatTickerRaw) {
      fiatAmount = parsedExplicitFiatAmount || parsedSharedFiatAmount;
    }
    if (!fiatAmount) {
      donateAmount = sanitizeDecimalAmount(zecAmountRaw || sharedAmountRaw, 8);
    }
  }

  const fiatTicker = fiatAmount ? fiatTickerRaw : "";

  return {
    memo,
    donateAmount,
    swapTicker: isNonZecTicker ? ticker : "",
    swapBaseLayer: isNonZecTicker ? swapBaseLayer : "",
    swapAmount,
    fiatTicker,
    fiatAmount,
  };
}

export async function generateMetadata({ params }: PageParamsProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    return {
      title: "Profile Not Found",
      description: "The requested profile could not be found.",
    };
  }

  const username = getUsernameWithDiscriminator(profile);
  const visibleName = profile.display_name || username || slug;

  return {
    title: `${visibleName} | Zcash.me`,
    description: profile.bio || `Zcash profile for ${username || slug}`,
    icons: {
      icon: profile.profile_image_url || "/favicon.ico",
    },
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    notFound();
  }

  const canonicalSlug = buildSlug(profile);
  const requestedSlug = decodeURIComponent(slug || "").trim().toLowerCase();
  if (canonicalSlug && requestedSlug !== canonicalSlug.toLowerCase()) {
    redirect(`/${canonicalSlug}${buildQuerySuffix(resolvedSearchParams)}`);
  }

  const [duplicateNameCount, tokensResult] = await Promise.all([
    profile.name ? getDuplicateNameCount(profile.name) : 0,
    getSwapTokens(),
  ]);

  const tokens = tokensResult.ok ? tokensResult.data : [];
  const initialPrefill = parseComposerPrefill(resolvedSearchParams);

  return (
    <ProfilePage
      initialProfile={profile}
      duplicateNameCount={duplicateNameCount}
      tokens={tokens}
      initialPrefill={initialPrefill}
    />
  );
}
