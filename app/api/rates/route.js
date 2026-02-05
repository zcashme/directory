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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fiat = (searchParams.get("fiat") || "USD").toUpperCase();
  const asset = searchParams.get("asset") || "ZEC";

  const providers = providersForFiat(fiat, asset);

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
    }
  }

  return new Response(JSON.stringify({ rate: null, source: null, fiat, asset }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=10",
    },
    status: 502,
  });
}
