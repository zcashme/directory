// app/api/rates/route.js

// NOTE: remove this line — it’s not needed and can cause weird build issues
// import { isAssetError } from "next/dist/client/route-loader";

/**
 * CoinGecko uses "ids" (not tickers). Add more as you need.
 * If a symbol isn't mapped, we'll just skip CoinGecko for it.
 */
const COINGECKO_ID_BY_SYMBOL = {
  BTC: "bitcoin",
  ETH: "ethereum",
  ZEC: "zcash",
  USDC: "usd-coin",
  USDT: "tether",
  WBTC: "wrapped-bitcoin",
  DAI: "dai",
  SOL: "solana",
  MATIC: "matic-network",
  BNB: "binancecoin",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  DOGE: "dogecoin",
  XRP: "ripple",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  TRX: "tron",
  XMR: "monero",
};

const providersForAssetFiat = (asset, fiat) => {
  const sym = String(asset || "ZEC").trim().toUpperCase();
  const fiatUpper = String(fiat || "USD").trim().toUpperCase();
  const fiatLower = fiatUpper.toLowerCase();

  const coingeckoId = COINGECKO_ID_BY_SYMBOL[sym];

  const providers = [
    // Coinbase (works for many, but not all tickers)
    {
      name: "Coinbase",
      url: `https://api.coinbase.com/v2/prices/${encodeURIComponent(sym)}-${encodeURIComponent(
        fiatUpper
      )}/spot`,
      parse: (data) => parseFloat(data?.data?.amount),
    },

    // CoinGecko (only if we have an id mapping)
    ...(coingeckoId
      ? [
          {
            name: "CoinGecko",
            url: `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
              coingeckoId
            )}&vs_currencies=${encodeURIComponent(fiatLower)}`,
            parse: (data) => parseFloat(data?.[coingeckoId]?.[fiatLower]),
          },
        ]
      : []),

    // CryptoCompare (works for many tickers; rate limits sometimes)
    {
      name: "CryptoCompare",
      url: `https://min-api.cryptocompare.com/data/price?fsym=${encodeURIComponent(
        sym
      )}&tsyms=${encodeURIComponent(fiatUpper)}`,
      parse: (data) => parseFloat(data?.[fiatUpper]),
    },
  ];

  return providers;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const fiat = (searchParams.get("fiat") || "USD").toUpperCase();
  const asset = (searchParams.get("asset") || "ZEC").toUpperCase();

  const providers = providersForAssetFiat(asset, fiat);

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { next: { revalidate: 10 } });
      if (!response.ok) continue;

      const data = await response.json();
      const rate = provider.parse(data);

      if (Number.isFinite(rate) && rate > 0) {
        return new Response(
          JSON.stringify({ rate, source: provider.name, fiat, asset }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "s-maxage=10",
            },
          }
        );
      }
    } catch {
      // ignore and try next provider
    }
  }

  return new Response(JSON.stringify({ rate: null, source: null, fiat, asset }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=60",
    },
    status: 502,
  });
}
