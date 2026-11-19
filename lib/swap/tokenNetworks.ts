// Display names for blockchain codes supplied by the 1Click token catalog.
export const BASE_LAYER_LABELS = {
  zec: "Zcash", btc: "Bitcoin", eth: "Ethereum", sol: "Solana",
  tron: "Tron", pol: "Polygon", avax: "Avalanche", arb: "Arbitrum",
  bsc: "BNB", base: "Base", monad: "Monad",
} as const;

export type BaseLayerKey = keyof typeof BASE_LAYER_LABELS;
export const BASE_LAYER_SORT_ORDER = Object.fromEntries(
  Object.keys(BASE_LAYER_LABELS).map((key, index) => [key, index]),
) as Record<BaseLayerKey, number>;

export function getBaseLayerKey(blockchain?: string): BaseLayerKey | null {
  const chain = (blockchain ?? "").toLowerCase().trim();
  return (Object.keys(BASE_LAYER_LABELS) as BaseLayerKey[]).find(
    (key) => chain === key || chain === BASE_LAYER_LABELS[key].toLowerCase(),
  ) ?? (chain === "bnb" || chain === "binance" ? "bsc" : null);
}

export function getProfileTokenNetwork(symbol: string, blockchain?: string): BaseLayerKey | null {
  const network = getBaseLayerKey(blockchain);
  if (!network) return null;
  if (["zec", "btc", "eth", "sol"].includes(network)) return network;
  if (symbol.toUpperCase() === "USDC" && network === "base") return network;
  return ["USDT", "USDT0"].includes(symbol.toUpperCase()) ? network : null;
}
