"use server";

import type { ExchangeRate } from "@/lib/api/types";

interface AssetMapping {
  coinbase: string;
  coingecko: string;
  cryptocompare: string;
}

// Map asset symbols to API identifiers
const ASSET_MAPPING: Record<string, AssetMapping> = {
  ZEC: {
    coinbase: "ZEC",
    coingecko: "zcash",
    cryptocompare: "ZEC"
  },
  BTC: {
    coinbase: "BTC",
    coingecko: "bitcoin",
    cryptocompare: "BTC"
  },
  ETH: {
    coinbase: "ETH",
    coingecko: "ethereum",
    cryptocompare: "ETH"
  },
  // Add more mappings as needed
};

interface Provider {
  name: string;
  url: string;
  parse: (_data: unknown) => number;
}

const providersForFiat = (fiat: string, asset: string = "ZEC"): Provider[] => {
  const fiatUpper = fiat.toUpperCase();
  const fiatLower = fiat.toLowerCase();
  const assetUpper = asset.toUpperCase();

  // Get asset identifiers or default to the asset symbol itself
  const mapping = ASSET_MAPPING[assetUpper] || {
    coinbase: assetUpper,
    coingecko: asset.toLowerCase(),
    cryptocompare: assetUpper
  };

  return [
    {
      name: "Coinbase",
      url: `https://api.coinbase.com/v2/prices/${mapping.coinbase}-${fiatUpper}/spot`,
      parse: (data: unknown) => parseFloat((data as { data?: { amount?: string } })?.data?.amount || ""),
    },
    {
      name: "CoinGecko",
      url: `https://api.coingecko.com/api/v3/simple/price?ids=${mapping.coingecko}&vs_currencies=${fiatLower}`,
      parse: (data: unknown) => parseFloat((data as Record<string, Record<string, string>>)?.[mapping.coingecko]?.[fiatLower] || ""),
    },
    {
      name: "CryptoCompare",
      url: `https://min-api.cryptocompare.com/data/price?fsym=${mapping.cryptocompare}&tsyms=${fiatUpper}`,
      parse: (data: unknown) => parseFloat((data as Record<string, string>)?.[fiatUpper] || ""),
    },
  ];
};

/**
 * Fetch exchange rate for a given asset and fiat currency
 * Uses Next.js unstable_cache for 10-second caching
 *
 * @param fiat - Fiat currency code (default: "USD")
 * @param asset - Asset symbol (default: "ZEC")
 * @returns Promise with exchange rate data
 */
async function fetchRateFromProvider(fiat: string, asset: string): Promise<ExchangeRate> {
  const fiatUpper = (fiat || "USD").toUpperCase();
  const assetUpper = (asset || "ZEC").toUpperCase();

  const providers = providersForFiat(fiatUpper, assetUpper);

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, {
        next: { revalidate: 10 }
      });
      if (!response.ok) continue;
      const data: unknown = await response.json();
      const rate = provider.parse(data);
      if (Number.isFinite(rate) && rate > 0) {
        return {
          ok: true,
          rate,
          source: provider.name,
          fiat: fiatUpper,
          asset: assetUpper,
        };
      }
    } catch {
      // Continue to next provider
    }
  }

  return {
    ok: false,
    rate: undefined,
    source: undefined,
    fiat: fiatUpper,
    asset: assetUpper,
    error: "Failed to fetch rate from all providers",
  };
}

/**
 * Server Action for fetching exchange rates
 * Used by AmountAndWallet component for currency conversion
 *
 * Note: Caching is handled at the fetch level using `next: { revalidate: 10 }`
 * which provides 10-second caching per currency pair automatically.
 *
 * @param fiat - Fiat currency code (default: "USD")
 * @param asset - Asset symbol (default: "ZEC")
 * @returns Promise with exchange rate data
 */
export async function getRateAction(fiat: string = "USD", asset: string = "ZEC"): Promise<ExchangeRate> {
  console.log("[SERVER ACTION] getRateAction called with fiat=", fiat, "asset=", asset);
  try {
    const fiatUpper = (fiat || "USD").toUpperCase();
    const assetUpper = (asset || "ZEC").toUpperCase();

    // Fetch rate - caching handled by Next.js fetch cache with revalidate: 10
    const result = await fetchRateFromProvider(fiatUpper, assetUpper);
    return result;
  } catch (e) {
    return {
      ok: false,
      rate: undefined,
      source: undefined,
      fiat: (fiat || "USD").toUpperCase(),
      asset: (asset || "ZEC").toUpperCase(),
      error: String((e as Error)?.message || e),
    };
  }
}
