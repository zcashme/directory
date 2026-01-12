const providersForFiat = (fiat) => {
  const fiatUpper = fiat.toUpperCase();
  const fiatLower = fiat.toLowerCase();
  return [
    {
      name: "Coinbase",
      url: `https://api.coinbase.com/v2/prices/ZEC-${fiatUpper}/spot`,
      parse: (data) => parseFloat(data?.data?.amount),
    },
    {
      name: "CoinGecko",
      url: `https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=${fiatLower}`,
      parse: (data) => parseFloat(data?.zcash?.[fiatLower]),
    },
    {
      name: "CryptoCompare",
      url: `https://min-api.cryptocompare.com/data/price?fsym=ZEC&tsyms=${fiatUpper}`,
      parse: (data) => parseFloat(data?.[fiatUpper]),
    },
  ];
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fiat = (searchParams.get("fiat") || "USD").toUpperCase();

  const providers = providersForFiat(fiat);

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { next: { revalidate: 60 } });
      if (!response.ok) continue;
      const data = await response.json();
      const rate = provider.parse(data);
      if (Number.isFinite(rate) && rate > 0) {
        return new Response(
          JSON.stringify({ rate, source: provider.name, fiat }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "s-maxage=60",
            },
          }
        );
      }
    } catch {
      // ignore and try next provider
    }
  }

  return new Response(JSON.stringify({ rate: null, source: null, fiat }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=60",
    },
    status: 502,
  });
}
