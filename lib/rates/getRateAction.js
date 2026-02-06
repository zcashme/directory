"use server";

// Map asset symbols to API identifiers
const ASSET_MAPPING = {
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

const providersForFiat = (fiat, asset = "ZEC") => {
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
      parse: (data) => parseFloat(data?.data?.amount),
    },
    {
      name: "CoinGecko",
      url: `https://api.coingecko.com/api/v3/simple/price?ids=${mapping.coingecko}&vs_currencies=${fiatLower}`,
      parse: (data) => parseFloat(data?.[mapping.coingecko]?.[fiatLower]),
    },
    {
      name: "CryptoCompare",
      url: `https://min-api.cryptocompare.com/data/price?fsym=${mapping.cryptocompare}&tsyms=${fiatUpper}`,
      parse: (data) => parseFloat(data?.[fiatUpper]),
    },
  ];
};

/**
 * Fetch exchange rate for a given asset and fiat currency
 * Uses Next.js unstable_cache for 10-second caching
 * 
 * @param {string} fiat - Fiat currency code (default: "USD")
 * @param {string} asset - Asset symbol (default: "ZEC")
 * @returns {Promise<{ok: boolean, rate?: number, source?: string, fiat?: string, asset?: string, error?: string}>}
 */
async function fetchRateFromProvider(fiat, asset) {
  const fiatUpper = (fiat || "USD").toUpperCase();
  const assetUpper = (asset || "ZEC").toUpperCase();
  
  const providers = providersForFiat(fiatUpper, assetUpper);

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { 
        next: { revalidate: 10 } 
      });
      if (!response.ok) continue;
      const data = await response.json();
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
    rate: null,
    source: null,
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
 * @param {string} fiat - Fiat currency code (default: "USD")
 * @param {string} asset - Asset symbol (default: "ZEC")
 * @returns {Promise<{ok: boolean, rate?: number, source?: string, fiat?: string, asset?: string, error?: string}>}
 */
export async function getRateAction(fiat = "USD", asset = "ZEC") {
  try {
    const fiatUpper = (fiat || "USD").toUpperCase();
    const assetUpper = (asset || "ZEC").toUpperCase();
    
    // Fetch rate - caching handled by Next.js fetch cache with revalidate: 10
    const result = await fetchRateFromProvider(fiatUpper, assetUpper);
    return result;
  } catch (e) {
    return {
      ok: false,
      rate: null,
      source: null,
      fiat: (fiat || "USD").toUpperCase(),
      asset: (asset || "ZEC").toUpperCase(),
      error: String(e?.message || e),
    };
  }
}
